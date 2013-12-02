var urlParser = require('urlparser');

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

function Ajax(method,url,options,data,res) {
    var xhr = new Xhr();

    if(typeof options === 'function'){
        res = options;
        options = null;
        data = null;
    } else if(typeof data === 'function'){
        res = data;
        data = null;
    }

    options = options ? options : {};

    if(typeof res === 'function') {
        var clb = res;
        res = {
            resolve: function(x){
                clb(undefined,x);
            },
            reject: function(x,c){
                clb(c||-1,x);
            },
            progress: function(x){
                clb(0,x);
            } 
        }
    } else {
        res = res ? res : {
            resolve: function(x){ 
                this.result = x;
                if(this.onfulfill) this.onfulfill(x); 
            },
            reject: function(x){ 
                this.error = x;
                if(this.onreject) this.onreject(x); 
            },
            progress: function(x){
                if(this.onprogress) this.onprogress = x;
            },
            when: function(f,r,p){
                this.onfulfill = f;
                this.onreject = r;
                this.onprogress = p;
            }
        }
    }

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

    xhr.onreadystatechange = function() {
        switch(xhr.readyState) {
            case XHR_DONE:
                    if(xhr.status){
                        if(xhr.status < 400) res.resolve(xhr);
                        else res.reject(xhr);
                    } else res.reject(xhr); // status = 0 (timeout or Xdomain)           
                break;
        }            
    }

    /* response headers */
    var headers;

    Object.defineProperty(xhr,'headers',{
        get: function(){
            if(!headers) headers = parseHeaders(xhr.getAllResponseHeaders());
            return headers;
        }
    });

    /* response timeout */
    if(options.timeout) { 
        setTimeout(function(){
            xhr.abort();
        }, options.timeout);
    }

    /* report progress */
    if(xhr.upload && res.progress) {
        xhr.upload.onprogress = function(e){
            e.percent = e.loaded / e.total * 100;
            res.progress(e);
        }
    }

    /* parse url */
    url = urlParser.parse(url);
    
    if(!url.host) url.host = {};

    /* merge host info with options */
    if(!url.host.protocol && options.protocol) url.host.protocol = options.protocol;
    if(!url.host.hostname && options.hostname) url.host.hostname = options.hostname;
    if(!url.host.port && options.port) url.host.port = options.port;

    url = url.toString();
    
    xhr.open(method,url,options.async);

    /* todo: set CORS credentials */

    /* set request headers */
    Object.keys(options.headers).forEach(function(header) {
        xhr.setRequestHeader(header,options.headers[header]);
    });

    /* stringify json */
    if(data && typeof data !== 'string' && options.headers['content-type'].indexOf('json'))
        data = JSON.stringify(data);

    /* request data */
    xhr.send(data);

    return res;
}

function parseHeaders(h) {
    var ret = Object.create(null), key, val, i;

    h.split('\n').forEach(function(header) {
        if((i=header.indexOf(':')) > 0) {
            key = header.slice(0,i).replace(/^[\s]+|[\s]+$/g,'').toLowerCase();
            val = header.slice(i+1,header.length).replace(/^[\s]+|[\s]+$/g,'');
            if(key && key.length) ret[key] = val;
        }   
    });

    return ret;
}

['head','get','put','post','delete','patch','trace','connect','options']
    .forEach(function(method) {
        Ajax[method] = function(url,options,data,res) {
            return Ajax(method,url,options,data,res);
        }
    });

module.exports = Ajax;