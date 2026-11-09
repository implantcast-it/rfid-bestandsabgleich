import "@/index.css"

import { Redirect, Route, Switch } from "wouter"
import React from "react"
import ReactDOM from "react-dom/client"
import { ThemeProvider } from "@/core/theme/ThemeContext"
import EditorScreen from "@/screens/EditorScreen"
import StartScreen from "@/screens/StartScreen"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <Switch>
        <Route path="/" component={StartScreen} />
        <Route path="/upload">
          <Redirect to="/" />
        </Route>
        <Route path="/processing">
          <Redirect to="/" />
        </Route>
        <Route path="/editor" component={EditorScreen} />
        <Route>404 Error - Das hat nicht funktioniert</Route>
      </Switch>
    </ThemeProvider>
  </React.StrictMode>
)
