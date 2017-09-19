const {Cc, Ci} = require("chrome");
var events = require("sdk/system/events");
const data = require("sdk/self").data;
var loggingDB = require("./loggingdb.js");
var tabs = require('sdk/tabs');


exports.run = function(crawlID) {

    // Set up logging
    var createCookiesTable = data.load("create_cookies_table.sql");
    loggingDB.executeSQL(createCookiesTable, false);

    // Instrument cookie changes
    events.on("cookie-changed", function(event) {
        var data = event.data;
        // TODO: Support other cookie operations
        if(data == "deleted" || data == "added" || data == "changed") {
            var update = {};
            update["change"] = loggingDB.escapeString(data);
            update["crawl_id"] = crawlID;

            var cookie = event.subject.QueryInterface(Ci.nsICookie2);

            // Creation time (in microseconds)
            var creationTime = new Date(cookie.creationTime / 1000); // requires milliseconds
            update["creationTime"] = creationTime.toLocaleFormat('%Y-%m-%d %H:%M:%S');

            // Expiry time (in seconds)
            // May return ~Max(int64). I believe this is a session
            // cookie which doesn't expire. Sessions cookies with
            // non-max expiry time expire after session or at expiry.
            var expiryTime = cookie.expiry; // returns seconds
            if (expiryTime == 9223372036854776000) {
                var expiryTimeString = '9999-12-31 23:59:59';
            } else {
                var expiryTimeDate = new Date(expiryTime * 1000) // requires milliseconds
                var expiryTimeString = expiryTimeDate.toLocaleFormat('%Y-%m-%d %H:%M:%S');
            }
            update["expiry"] = expiryTimeString;
            update["is_http_only"] = loggingDB.boolToInt(cookie.isHttpOnly);
            update["is_session"] = loggingDB.boolToInt(cookie.isSession);

            // Accessed time (in microseconds)
            var lastAccessedTime = new Date(cookie.lastAccessed / 1000); // requires milliseconds
            update["last_accessed"] = lastAccessedTime.toLocaleFormat('%Y-%m-%d %H:%M:%S');
            update["raw_host"] = loggingDB.escapeString(cookie.rawHost);

            cookie = cookie.QueryInterface(Ci.nsICookie);
            update["expires"] = cookie.expires;
            update["host"] = loggingDB.escapeString(cookie.host);
            update["is_domain"] = loggingDB.boolToInt(cookie.isDomain);
            update["is_secure"] = loggingDB.boolToInt(cookie.isSecure);
            update["name"] = loggingDB.escapeString(cookie.name);
            update["path"] = loggingDB.escapeString(cookie.path);
            update["policy"] = cookie.policy;
            update["status"] = cookie.status;
            update["value"] = loggingDB.escapeString(cookie.value);

            /*
             * This records the current URL in the tab with the cookie.
             *
             * There is a known limitation of this code, it actually really
             * just records the current URL in the tab. Assume that the browser
             * is on a.tld and the user clicks to a link pointing to b.tld.
             * The server on b.tld sends an HTTP redirect response pointing
             * to c.tld and also sets a cookie. Then the current URL in the
             * tab is still a.tld when the cookie is set, but as seen from a
             * first/third party perspective, the browser is on b.tld.
             */
            update["top_url"] = loggingDB.escapeString(tabs.activeTab.url);

            loggingDB.executeSQL(loggingDB.createInsert("javascript_cookies", update), true);
        }
    }, true);

};
