var Promise = require('promise'),
    urlParser = require('urlparser');

/* default request timeout */
var DEFAULT_TIMEOUT = 5000;

/* Get browser xhr object */
var Xhr = (function() {  
    if(window.XDomainRequest) {
        return window.XDomainRequest;
    } else if(window.XMLHttpRequest) {
        return window['XMLHttpRequest'];
    } else if(window.ActiveXObject) {
        ['Msxml2.XMLHTTP.6.0','Msxml2.XMLHTTP.3.0','Microsoft.XMLHTTP'].forEach(function(x) {
            try { return window.ActiveXObject(x) } catch (e) {}
        }); 
        throw new Error('XHR ActiveXObject failed');
    } 
    throw new Error('XHR support not found');
}());

/* ReadyState status codes */
var XHR_CLOSED = 0,
    XHR_OPENED = 1,
    XHR_SENT = 2,
    XHR_RECEIVED = 3,
    XHR_DONE = 4; 

function Ajax(method,url,options,data) {
    var res = new Promise(),
        xhr = new Xhr();

    options = options ? options : {};

    if(!options.async) options.async = true;
    
    if(!options.timeout) options.timeout = DEFAULT_TIMEOUT;
    
    if(!options.headers) options.headers = {};
    
    if(!options.headers.accept){
        options.headers.accept = options.accept||'application/json';
    }

    if(options.charset){
        options.headers['accept-charset'] = options.charset;
    }

    if(!options.headers['content-type']){
        options.headers['content-type'] = options.type||'application/json';
    }

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
        var msg;
        switch(xhr.readyState) {
            case XHR_DONE:
                    msg = xhr.responseText;
                    if(xhr.status){
                    
                        xhr.headers = parseHeaders(xhr.getAllResponseHeaders());

                        if((xhr.headers['content-type'] && 
                            !(xhr.headers['content-type'].indexOf('json') < 0)) ||
                            (options.accept && !(options.accept.indexOf('application/json') < 0)) ) {
                            try { msg = JSON.parse(msg) } catch(err) {/* (!) */}
                        }
                            
                        if(xhr.status < 400) res.fulfill(msg);
                        else res.reject(msg);
                    } else res.reject(msg); // status = 0           
                break;
        }            
    }

    url = urlParser.parse(url);
    
    if(!url.host) url.host = {};

    /* merge host info with options */
    if(!url.host.protocol && options.protocol) url.host.protocol = options.protocol;
    if(!url.host.hostname && options.hostname) url.host.hostname = options.hostname;
    if(!url.host.port && options.port) url.host.port = options.port;

    url = url.toString();
    
    xhr.open(method,url,options.async);

    /* set request headers */
    Object.keys(options.headers).forEach(function(header) {
        xhr.setRequestHeader(header,options.headers[header]);
    });

    if(data && options.headers['content-type'].indexOf('json'))
        data = JSON.stringify(data);

    /* request data */
    xhr.send(data);

    /* response timeout */
    res.timeout(options.timeout,function(){
        xhr.abort();
    });

    return res;
}

['head','get','put','post','delete','patch','trace','connect','options']
    .forEach(function(method) {
        Ajax[method] = function(url,options,data) {
            return Ajax(method,url,options,data);
        }
    });

module.exports = Ajax;