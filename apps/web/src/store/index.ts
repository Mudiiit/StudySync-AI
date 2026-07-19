import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    ui: (state = { sidebarOpen: true }, action: any) => {
      switch (action.type) {
        case 'ui/toggleSidebar':
          return { ...state, sidebarOpen: !state.sidebarOpen };
        default:
          return state;
      }
    },
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
