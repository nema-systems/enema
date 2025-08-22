import { configureStore } from "@reduxjs/toolkit";
import workspacesReducer from "./workspaces/workspaces.slice";
import requirementsReducer from "./requirements/requirements.slice";
import projectsReducer from "./projects/projects.slice";
import componentsReducer from "./components/components.slice";
import parametersReducer from "./parameters/parameters.slice";
import testcasesReducer from "./testcases/testcases.slice";
import assetsReducer from "./assets/assets.slice";

const store = configureStore({
  reducer: {
    workspaces: workspacesReducer,
    requirements: requirementsReducer,
    projects: projectsReducer,
    components: componentsReducer,
    parameters: parametersReducer,
    testcases: testcasesReducer,
    assets: assetsReducer,
  },
  devTools: import.meta.env.NODE_ENV !== "production",
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;