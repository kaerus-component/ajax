var Promise = require('promise');

/* default request timeout */
var DEFAULT_TIMEOUT = 5000;

/* ReadyState status codes */
var XHR_CLOSED = 0,
    XHR_OPENED = 1,
    XHR_SENT = 2,
    XHR_RECEIVED = 3,
    XHR_DONE = 4; 

function Ajax(method,url,options,data) {
    var res = new Promise(),
        xhr = new XMLHttpRequest;

    options = options ? options : {};

    if(!options.async) options.async = true;
    if(!options.timeout) options.timeout = DEFAULT_TIMEOUT;
    if(!options.headers) options.headers = {};
    if(!options.headers.accept){
        if(!options.accept) options.accept = {type:'application',format:'json'};
        else if(typeof options.accept === 'string') {
            var a, i = 0, type = 'application',format = 'json';
            a = options.accept.split('/');
            if(a.lenght) type = a[i++];
            format = a[i]; 

            options.accept = {type:type,format:format};
        }

        options.headers.accept = options.accept.type + "/" + options.accept.format;
    }
    
    res.attach(xhr);

    function parseHeaders(h) {
        var ret = {}, key, val, i;

        h.split('\n').forEach(function(header) {
            if((i=header.indexOf(':')) > 0) {
                key = header.slice(0,i).replace(/^[\s]+|[\s]+$/g,'').toLowerCase();
                val = header.slice(i+1,header.length).replace(/^[\s]+|[\s]+$/g,'');
                if(key && key.length) ret[key] = val;
            }   
        });

        return ret;
    }

    xhr.onreadystatechange = function() {
        switch(xhr.readyState) {
            case XHR_DONE:
                    var msg = xhr.responseText;
                    xhr.headers = parseHeaders(xhr.getAllResponseHeaders());

                    if(options.headers.accept.indexOf('json') >= 0)
                        try { msg = JSON.parse(msg) } catch(err) {/* (!) */}

                    if(xhr.status < 400) res.fulfill(msg);
                    else res.reject(msg);       
                break;
        }            
    }

    xhr.open(method,url.toString(),options.async);

    /* set request headers */
    Object.keys(options.headers).forEach(function(header) {
        xhr.setRequestHeader(header,options.headers[header]);
    });

    /* request data */
    xhr.send(data);

    /* response timeout */
    res.timeout(options.timeout);

    return res;
}

['head','get','put','post','delete','patch','trace','connect','options']
    .forEach(function(method) {
        Ajax[method] = function(url,options,data) {
            return Ajax(method,url,options,data);
        }
    });

module.exports = Ajax;