import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Asset {
  id: number;
  workspace_id: number;
  creator_id?: number;
  name: string;
  public_id: string;
  file_path: string;
  file_type: string;
  description?: string;
  created_at: string;
}

interface AssetsState {
  items: Asset[];
  loading: boolean;
  error: string | null;
  uploading: boolean;
}

const initialState: AssetsState = {
  items: [],
  loading: false,
  error: null,
  uploading: false,
};

// Async thunks
export const fetchAssets = createAsyncThunk(
  "assets/fetchAssets",
  async (params: {
    workspaceId: number;
    token: string;
    page?: number;
    limit?: number;
    file_type?: string;
    creator_id?: number;
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
    const url = `${apiUrl}/api/v1/workspaces/${workspaceId}/assets/?${query}`;
    
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

export const uploadAsset = createAsyncThunk(
  "assets/uploadAsset",
  async (params: {
    workspaceId: number;
    file: File;
    name?: string;
    description?: string;
  }) => {
    const { workspaceId, file, name, description } = params;
    
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

export const updateAsset = createAsyncThunk(
  "assets/updateAsset",
  async (params: {
    workspaceId: number;
    assetId: number;
    updates: {
      name?: string;
      description?: string;
    };
  }) => {
    const { workspaceId, assetId, updates } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/assets/${assetId}`,
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

export const deleteAsset = createAsyncThunk(
  "assets/deleteAsset",
  async (params: { workspaceId: number; assetId: number }) => {
    const { workspaceId, assetId } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/assets/${assetId}`,
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

    return assetId;
  }
);

export const downloadAsset = createAsyncThunk(
  "assets/downloadAsset",
  async (params: { workspaceId: number; assetId: number; assetName: string }) => {
    const { workspaceId, assetId, assetName } = params;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(
      `${apiUrl}/api/v1/workspaces/${workspaceId}/assets/${assetId}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = assetName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return assetId;
  }
);

// Slice
const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch assets
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.items;
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch assets";
      })
      // Upload asset
      .addCase(uploadAsset.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadAsset.fulfilled, (state, action) => {
        state.uploading = false;
        state.items.unshift(action.payload);
      })
      .addCase(uploadAsset.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.error.message || "Failed to upload asset";
      })
      // Update asset
      .addCase(updateAsset.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      // Delete asset
      .addCase(deleteAsset.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      // Download asset (no state changes needed)
      .addCase(downloadAsset.rejected, (state, action) => {
        state.error = action.error.message || "Failed to download asset";
      });
  },
});

export const { clearError } = assetsSlice.actions;
export default assetsSlice.reducer;