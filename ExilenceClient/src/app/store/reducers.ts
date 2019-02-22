import { ActionReducer, ActionReducerMap, MetaReducer } from '@ngrx/store';

import { AppConfig } from '../../environments/environment';
import { AppState } from '../app.states';
import * as ladderReducer from './ladder/ladder.reducer';
import * as spectatorCountReducer from './spectator-count/spectator-count.reducer';

export const reducers: ActionReducerMap<AppState> = {
  ladderState: ladderReducer.ladderReducer,
  spectatorCountState: spectatorCountReducer.spectatorCountReducer
};

export function logger(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return function(state: AppState, action: any): AppState {
    console.log('state', state);
    console.log('action', action);
    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<AppState>[] = !AppConfig.production
  ? [logger]
  : [];
