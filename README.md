AutobahnExtJS
=============

AutobahnJS and Sencha/ExtJS Integration

There are two ways to use AutobahnJS with Sencha ExtJS.

1. You can just include the autobahnextjs-min.js and autobahn-min.js into your index.html.

2. You can include AutobahnExtJS into your existing Sencha build process as follows:


To integrate Autobahn into your existing Sencha projects build stack you need to 
use the Sencha build tool. You can get it here http://www.sencha.com/products/sencha-cmd/download. 
Under this link you can also find the documentation for the Sencha Cmd build process. 


Once you installed Sencha Cmd change into the directory of you app and add AutobahnExtJS to your project by

    sencha add autobahnextjs

This downloads the autobahnextjs repository from the Sencha Marketplace and adds it as a package to your project.
Then you can do

    sencha app refresh
    sencha app build 
    
as usual.
You can find more details on this process under Look at http://docs.sencha.com/extjs/4.2.1/#!/guide/command_package_authoring.
