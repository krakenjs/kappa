var http = require('http');


function sum(obj) {
    return Object.keys(obj).reduce(function (prev, curr) {
        return prev + obj[curr].length;
    }, 0);
}

exports.getRequestQueueSize = function (agent) {
    agent = agent || http.globalAgent;
    return sum(agent.requests);
};


exports.getActiveSocketCount = function (agent) {
    agent = agent || http.globalAgent;
    return sum(agent.sockets);
};


exports.getMaxSockets = function (agent) {
    agent = agent || http.globalAgent;
    return agent.maxSockets;
};