import "./index.css";

import { Route, Switch } from "wouter";

import App from "./App";
import Editor from "./Editor";
import Finished from "./Finished";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Switch>
      <Route path='/' component={App} />
      <Route path='/editor' component={Editor} />
      <Route path='/finished' component={Finished} />
      <Route>404 Error - Das hat nicht funktioniert</Route>
    </Switch>
  </React.StrictMode>
);
