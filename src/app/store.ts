import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { securityApi } from "./securityApi";
import { checksCatalogueApi } from "./checksCatalogueApi";

export const store = configureStore({
  reducer: { [securityApi.reducerPath]: securityApi.reducer, [checksCatalogueApi.reducerPath]: checksCatalogueApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(securityApi.middleware, checksCatalogueApi.middleware),
});
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
