import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiUrl } from '../../utils/api';

export interface TestCase {
  id: number;
  workspace_id: number;
  name: string;
  public_id: string;
  test_method: string;
  expected_results: string;
  execution_mode: string;
  notes?: string;
  metadata?: any;
  created_at: string;
}

export interface TestRun {
  id: number;
  test_case_id: number;
  executor_id?: number;
  result: string;
  executed_at: string;
  metadata?: any;
  created_at: string;
}

export interface TestCaseWithRuns extends TestCase {
  runs?: TestRun[];
}

interface TestCasesState {
  items: TestCaseWithRuns[];
  loading: boolean;
  error: string | null;
  currentTestCase: TestCaseWithRuns | null;
}

const initialState: TestCasesState = {
  items: [],
  loading: false,
  error: null,
  currentTestCase: null,
};

// Async thunks
export const fetchTestCases = createAsyncThunk(
  "testcases/fetchTestCases",
  async (params: {
    workspaceId: number;
    token: string;
    page?: number;
    limit?: number;
    status?: string;
    tag_id?: number;
    group_id?: number;
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

    const url = `${apiUrl(`/api/v1/workspaces/${workspaceId}/testcases`)}/?${query}`;
    
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

export const fetchTestCase = createAsyncThunk(
  "testcases/fetchTestCase",
  async (params: { workspaceId: number; testcaseId: number; token: string }) => {
    const { workspaceId, testcaseId, token } = params;

    const response = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/testcases/${testcaseId}`),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

export const createTestCase = createAsyncThunk(
  "testcases/createTestCase",
  async (params: {
    workspaceId: number;
    testcase: {
      name: string;
      test_method: string;
      expected_results: string;
      execution_mode: string;
      notes?: string;
      metadata?: any;
    };
  }) => {
    const { workspaceId, testcase } = params;

    const response = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/testcases`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: JSON.stringify(testcase),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
);

export const updateTestCase = createAsyncThunk(
  "testcases/updateTestCase",
  async (params: {
    workspaceId: number;
    testcaseId: number;
    updates: Partial<{
      name: string;
      test_method: string;
      expected_results: string;
      execution_mode: string;
      notes: string;
      metadata: any;
    }>;
  }) => {
    const { workspaceId, testcaseId, updates } = params;

    const response = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/testcases/${testcaseId}`),
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

export const deleteTestCase = createAsyncThunk(
  "testcases/deleteTestCase",
  async (params: { workspaceId: number; testcaseId: number }) => {
    const { workspaceId, testcaseId } = params;

    const response = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/testcases/${testcaseId}`),
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

    return testcaseId;
  }
);

export const createTestRun = createAsyncThunk(
  "testcases/createTestRun",
  async (params: {
    workspaceId: number;
    testcaseId: number;
    runData: {
      status: string;
      notes?: string;
      metadata?: any;
    };
  }) => {
    const { workspaceId, testcaseId, runData } = params;

    const response = await fetch(
      apiUrl(`/api/v1/workspaces/${workspaceId}/testcases/${testcaseId}/runs`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
        },
        body: JSON.stringify(runData),
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
const testCasesSlice = createSlice({
  name: "testcases",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTestCase: (state, action: PayloadAction<TestCaseWithRuns | null>) => {
      state.currentTestCase = action.payload;
    },
    clearCurrentTestCase: (state) => {
      state.currentTestCase = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch test cases
      .addCase(fetchTestCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTestCases.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data.items;
      })
      .addCase(fetchTestCases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch test cases";
      })
      // Fetch single test case
      .addCase(fetchTestCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTestCase.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTestCase = action.payload;
      })
      .addCase(fetchTestCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch test case";
      })
      // Create test case
      .addCase(createTestCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTestCase.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createTestCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create test case";
      })
      // Update test case
      .addCase(updateTestCase.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
        if (state.currentTestCase && state.currentTestCase.id === action.payload.id) {
          state.currentTestCase = { ...state.currentTestCase, ...action.payload };
        }
      })
      // Delete test case
      .addCase(deleteTestCase.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.currentTestCase && state.currentTestCase.id === action.payload) {
          state.currentTestCase = null;
        }
      })
      // Create test run
      .addCase(createTestRun.fulfilled, (state, action) => {
        const { testcaseId, testrun } = action.payload;
        const testcaseIndex = state.items.findIndex((item) => item.id === testcaseId);
        if (testcaseIndex !== -1) {
          if (!state.items[testcaseIndex].runs) {
            state.items[testcaseIndex].runs = [];
          }
          state.items[testcaseIndex].runs!.unshift(testrun);
        }
        if (state.currentTestCase && state.currentTestCase.id === testcaseId) {
          if (!state.currentTestCase.runs) {
            state.currentTestCase.runs = [];
          }
          state.currentTestCase.runs.unshift(testrun);
        }
      });
  },
});

export const { clearError, setCurrentTestCase, clearCurrentTestCase } = testCasesSlice.actions;
export default testCasesSlice.reducer;