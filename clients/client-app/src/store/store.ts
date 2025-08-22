import { configureStore } from "@reduxjs/toolkit";
import workspacesReducer from "./workspaces/workspaces.slice";
import requirementsReducer from "./requirements/requirements.slice";
import projectsReducer from "./projects/projects.slice";

const store = configureStore({
  reducer: {
    workspaces: workspacesReducer,
    requirements: requirementsReducer,
    projects: projectsReducer,
  },
  devTools: import.meta.env.NODE_ENV !== "production",
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;