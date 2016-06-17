'use strict';

module.exports = (pluginContext) => {
    const app = pluginContext.app;
    const shell = pluginContext.shell;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences;

    const TIMEOUT = 200;
    const FAKE = "FAKE_ID";

    var gitlab = require('node-gitlab');
    var client;

    const initClient = (prefs)=>{
        if (prefs.gitlabInstallation && prefs.privateToken){
            client = gitlab.create({
                api: prefs.gitlabInstallation + '/api/v3',
                privateToken: prefs.privateToken
            });
        }
    };

    function startup() {
        initClient(preferences.get());
        preferences.on('update',initClient);
    }

    function debounce(pFunction) {
        var timer;
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(function() {
            pFunction.fn(pFunction.arg1);
            timer = 0;
        }, TIMEOUT);
    }



    function queryProjects(pSearchString, pRes) {
        const prefs =preferences.get();
        pRes.add({
            id: FAKE,
            title: 'fetching...',
            desc: 'from ' + prefs.gitlabInstallation,
            icon: '#fa fa-spinner fa-spin'
        });
        client.projects.search({
            query: pSearchString
        }, function(err, projects) {
            pRes.remove(FAKE);

            if (err){
                pRes.add({
                    id: FAKE,
                    title: "Oops, could'nt get your results",
                    desc: "Make sure plugin preferences are correct, Click here to check",
                    icon :"#fa fa-exclamation-circle",
                    payload:{action:'prefs'}
                });
                return;
            }
            if (projects) {
                for (var i = 0; i < projects.length; i++) {
                    const project = projects[i];
                    var projectResponse = {
                        id: project.id,
                        title: project.name_with_namespace,
                        desc: project.description,
                        payload: {action:'open',url:project.web_url},
                        icon: project.avatar_url ? project.avatar_url + '?private_token=' + prefs.privateToken : "#fa fa-product-hunt"
                    };
                    pRes.add(projectResponse);
                }
            } else {
                pRes.add({
                    id: FAKE,
                    payload: undefined,
                    title: "No project found matching your criteria: '" + pSearchString + "'",
                    desc: "Try again with another search."
                });
            }
        });
    }

    function search(pSearchString, res) {

        if (!client){
            res.add({
                id: FAKE,
                title: "Please enter gitlab url and token",
                desc: "Click this to open preferences",
                icon :"#fa fa-unlock-alt",
                payload:{
                    action:'prefs'
                }
            });
            return;
        }
        else {
            res.remove(FAKE);
        }

        const searchString = pSearchString.trim();
        if (searchString.length == 0) {
            res.add({
                id: FAKE,
                title: 'Type in your query...',
                desc: '... for Gitlab',
                icon: '#fa fa-pencil'
            });
        } else {
            debounce(queryProjects(searchString, res));
        }
    }

    function execute(id, payload) {
        logger.log(JSON.stringify(payload))
        if (payload) {
            switch (payload.action){
                case 'prefs':{
                    app.openPreferences('hain-plugin-gitlab');
                    break;
                }
                case 'open':{
                    shell.openExternal(payload.url);
                    app.close();
                    break;
                }

            }
        }
    }

    return {
        startup,
        search,
        execute
    };
};
