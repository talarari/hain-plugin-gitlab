'use strict';

module.exports = (pluginContext) => {
  const app = pluginContext.app;
  const shell = pluginContext.shell;
  const logger = pluginContext.logger;
  const preferences = pluginContext.preferences.get();

  const TIMEOUT = 200;
  const FAKE = "FAKE_ID";

  var gitlab = require('node-gitlab');
  var client;


  function startup() {
    client = gitlab.create({
      api: preferences.gitlabInstallation + '/api/v3',
      privateToken: preferences.privateToken
    });
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
    pRes.add({
      id: FAKE,
      title: 'fetching...',
      desc: 'from Gitlab',
      icon: '#fa fa-spinner fa-spin'
    });
    client.projects.search({
      query: pSearchString
    }, function(err, projects) {
      pRes.remove(FAKE);
      if (projects) {
        for (var i = 0; i < projects.length; i++) {
          const project = projects[i];
          var projectResponse = {
            id: project.id,
            title: project.name_with_namespace,
            desc: project.description,
            payload: project.web_url,
            icon: project.avatar_url ? project.avatar_url + '?private_token=' + preferences.privateToken : "#fa fa-product-hunt"
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
    if (payload) {
      shell.openExternal(payload);
    }
    app.close();
  }

  return {
    startup,
    search,
    execute
  };
};
