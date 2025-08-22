import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Parameter {
  id: number;
  base_param_id?: number;
  prev_version?: number;
  author_id: number;
  name: string;
  type: string;
  description?: string;
  value?: any;
  group_id: string;
  version_number: number;
  metadata?: any;
  created_at: string;
}

interface ParametersState {
  items: Parameter[];
  loading: boolean;
  error: string | null;
}

const initialState: ParametersState = {
  items: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchParameters = createAsyncThunk(
  "parameters/fetchParameters",
  async (params: {
    workspaceId: number;
    token: string;
    page?: number;
    limit?: number;
    component_id?: number;
    type?: string;
    group_id?: string;
    author_id?: number;
    search?: string;
    sort?: string;
    order?: string;
  }) => {
    const { workspaceId, token, ...queryParams } = params;
    const query = new URLSearchParams();
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value.toString());
      }
    });

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}/api/v1/workspaces/${workspaceId}/parameters/?${query}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, response.statusText, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
);

export const createParameter = createAsyncThunk(
  "parameters/createParameter",
  async (params: {
    workspaceId: number;
    parameter: {
      name: string;
      type: string;
      description?: string;
      value?: any;
      group_id: string;
      metadata?: any;
    };
  }) => {
    const { workspaceId, parameter } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/parameters`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: JSON.stringify(parameter),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

export const updateParameter = createAsyncThunk(
  "parameters/updateParameter",
  async (params: {
    workspaceId: number;
    parameterId: number;
    updates: {
      name?: string;
      type?: string;
      description?: string;
      value?: any;
      group_id?: string;
      metadata?: any;
    };
  }) => {
    const { workspaceId, parameterId, updates } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/parameters/${parameterId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

export const deleteParameter = createAsyncThunk(
  "parameters/deleteParameter",
  async (params: { workspaceId: number; parameterId: number }) => {
    const { workspaceId, parameterId } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/parameters/${parameterId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return parameterId;
  }
);

export const createParameterVersion = createAsyncThunk(
  "parameters/createParameterVersion",
  async (params: {
    workspaceId: number;
    parameterId: number;
    version: {
      name?: string;
      type?: string;
      description?: string;
      value?: any;
      group_id?: string;
      metadata?: any;
    };
  }) => {
    const { workspaceId, parameterId, version } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/parameters/${parameterId}/versions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: JSON.stringify(version),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

// Slice
const parametersSlice = createSlice({
  name: "parameters",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch parameters
      .addCase(fetchParameters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParameters.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.items;
      })
      .addCase(fetchParameters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch parameters";
      })
      // Create parameter
      .addCase(createParameter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createParameter.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createParameter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create parameter";
      })
      // Update parameter
      .addCase(updateParameter.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      // Delete parameter
      .addCase(deleteParameter.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      // Create parameter version
      .addCase(createParameterVersion.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { clearError } = parametersSlice.actions;
export default parametersSlice.reducer;