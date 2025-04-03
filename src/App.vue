<template>
    <div id="app">
      <main>
        <router-view />
      </main>
    </div>
  </template>
  
  <script>
  export default {
    name: "App",
  };
  </script>
  
  <style>
  #app {
    text-align: center;
    margin-top: 0;
  }
  
  header {
    background-color: #2957af;
    color: white;
    padding: 1rem;
  }
  
  main {
    padding: 1rem;
  }
  </style>