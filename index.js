var Promise = require('promise');


function Ajax(method,url,options,data) {
    var res = new Promise(),
        xhr = new XMLHttpRequest;

    options = options ? options : {};
    data = data ? data : null;

    if(typeof options !== 'object') options = {url:options};
    if(!options.async) options.async = true;
    if(!options.timeout) options.timeout = 5000;
    if(!options.headers) options.headers = {};
    if(!options.headers.accept) options.headers.accept = "application/json";

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
        if(xhr.readyState === 4 && xhr.status) {
            var msg = xhr.responseText;
            xhr.headers = parseHeaders(xhr.getAllResponseHeaders());

            if(options.headers.accept.indexOf('json') >= 0)
                try { msg = JSON.parse(msg) } catch(err) {}

            if(xhr.status < 400) res.fulfill(msg);
            else res.reject(msg);     
        }
    }

    xhr.open(method,url,options.async);

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
    
   