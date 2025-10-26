import "./index.css";

import { Route, Switch } from "wouter";

import EditorScreen from "./EditorScreen";
import FileUploadScreen from "./FileUploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import React from "react";
import ReactDOM from "react-dom/client";
import StartScreen from "./StartScreen";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Switch>
      <Route path='/' component={StartScreen} />
      <Route path='/upload' component={FileUploadScreen} />
      <Route path='/processing' component={ProcessingScreen} />
      <Route path='/editor' component={EditorScreen} />
      <Route>404 Error - Das hat nicht funktioniert</Route>
    </Switch>
  </React.StrictMode>
);
