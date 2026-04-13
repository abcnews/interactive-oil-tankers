/**
 * @file
 * CoreMedia entrypoint. Creates a non-module coremedia.js in your build.
 */
import { whenOdysseyLoaded } from "@abcnews/env-utils";
import { getMountValue, selectMounts } from "@abcnews/mount-utils";
import App from "./App.svelte";
import { mount } from "svelte";

whenOdysseyLoaded.then(() => {
  const documentBody = document.body;

  if (documentBody) {
    mount(App, {
      target: documentBody,
      props: {},
    });
  }
});

export default App;
