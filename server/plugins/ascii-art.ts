export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const asciiArt = `<!--

         ------
       /--  --- \\
      |👁👃 👁 ░👂  👍
   👋  \\ 👄   ░/   //
    ||    --- ░/   ||    thank u for coming
     \\\\     | ░|   //

-->`
    html.head.unshift(asciiArt)
  })
})
