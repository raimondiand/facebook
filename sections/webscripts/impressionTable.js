function loadTimelines(userId, containerId, detailsContainer, detailDesc) {
    var url = '/api/v1/timelines/' + userId;

    $.getJSON(url, function(collections) {

        /* convert collections with basic shape explained here 
         * https://datatables.net/manual/data/ */
        var converted = _.map(collections, function(list) {
            return [
                moment(list.startTime).format("YYYY-MM-DD"),
                list.when,
                list.duration,
                list.visible,
                list.total,
                list.timelineId
            ];
        });

        $(containerId).DataTable( {
            data: converted,
            "createdRow": function ( row, data, index ) {
                $(row).click(function() {
                    renderTimeline(detailsContainer, detailDesc, data[5]);
                });
            } 
        });
    });
};

function fillmetablob(containerId, entry) {
    $('<pre>' + 
        JSON.stringify(entry, undefined, 2) + 
      '</pre>').appendTo(containerId);
};

function renderTimeline(containerId, detailDesc, timelineId) {
    var url = '/api/v1/metadata/' + timelineId;

    $(detailDesc).text("Showing content from " + url);
    $(containerId).empty();
    $.getJSON(url, function(collections) {
        _.each(collections, function(metaentry) {
            fillmetablob(containerId, metaentry);
        });
    });
};

/* ----------------------- */

function loadPromoted(userId, containerId) {
    var url = "/api/v1/personal/promoted/" + userId + '/0/10';
    console.log(url);

    /* When Owner MediaType PromotedLink */
    $.getJSON(url, function(collections) {
        /* convert collections with basic shape explained here 
         * https://datatables.net/manual/data/ */
        console.log(collections);
        var converted = _.map(collections, function(o) {
            return [ o.daysago, o.ownerName, o.promotedMedia, o.promotedPage ];
        });
        console.log(converted[0]);
        $(containerId).DataTable( {
            data: converted
        });
    });
};

/* This is temporarly not used, was called in the two-heatmap landing page */
function loadHeatmap(userId, recentC, olderC) {
    var url = "/api/v1/personal/heatmap/" + userId;

    /* you can ask for a time window from the API */
    var recentUrl = "/api/v1/personal/heatmap/" + userId + "/0/1";
    var olderUrl = "/api/v1/personal/heatmap/" + userId + "/2/20";

    var recent = new CalHeatMap();
    recent.init({
        itemSelector: recentC,
        data: recentUrl,
        legendColors: {
            min: "#efefef",
            max: "steelblue",
            empty: "white"
        },
        verticalOrientation: true,
        displayLegend: false,
        cellSize: 25,
        domainGutter: 2,
        label: { position: 'top' },
        range: 2,
        start: new Date(moment().subtract(1,'d')),
        domain: "day",
        subDomain: "hour"
    });

    var older = new CalHeatMap();
    older.init({
        itemSelector: olderC,
        data: olderUrl,
        start: new Date(moment().subtract(20, 'd')),
        range: 20,
        domain: "day",
        subDomain: "hour"
    });
};

function getSupporterId() {
    var chunks = document.location.pathname.split('/');
    // ["", "realitycheck", "100009030987674", "recent"]
    _.reverse(chunks);
    chunks.pop();
    chunks.pop();
    var userId = chunks.pop();
    console.log("Extracted from URL " + userId);
    return userId;
};

function loadCalmap(userId, containerId) {

    /* you can ask for a time window from the API */
    var lastTen= "/api/v1/personal/heatmap/" + userId + "/0/10";
    console.log("loading last 10 days calendar heatmap " + lastTen);

    var calhtmp= new CalHeatMap();

    return $.getJSON(lastTen, function(content) {
        if(!_.size(content)) {
            var sorry = [ '<h3>',
                          '…Sorry! Seems you have not yet submitted data!',
                          '</h3>', '<p>',
                          'Is your key publication been done properly, in a public post, right? (can only post the key, and delete the post later)',
                          '</p>', '<p>',
                          'If some problem is going on, admin manually try to fix it, keep using the browser with the extension installed, and thank you for belonging to this collective experiment.',
                          '</p>' ];
            $(containerId).html(sorry.join(''));
            return;
        } 
        calhtmp.init({
            itemSelector: containerId,
            data: content,
            cellSize: 20,
            start: new Date(moment().subtract(9, 'd')),
            range: 10,
            domain: "day",
            subDomain: "hour",
            legendColors: [ "yellow", "steelblue" ]
        });
    });
};

function loadContribution(userId, containerId) {
    var url = "/api/v1/personal/contribution/" + userId + '/0/10';
    console.log("loading last 10 days of impressions contributed " + url);
    /* DaysAgo timeline impressions htmls */
    $.getJSON(url, function(collections) {
        /* convert collections with basic shape explained here 
         * https://datatables.net/manual/data/ */
        var converted = _.map(collections, function(infob) {
            return _.values(infob)
        });
        console.log(converted[0]);
        $(containerId).DataTable( {
            data: converted
        });
    });
    $(containerId).append('<p>This is the results from</p>');
    $(containerId).append('<pre>' + url + '</pre>');
};

function promotedFormat(entry) {
    var distance = moment.duration(moment() - moment(entry.savingTime)).humanize();
    var promotedPrefix = '<span class="prefix">﴿ promoted</span>';
    if(entry.promotedTitle && entry.promotedInfo)
       var promotedInfo = '<a target="_blank" href="' + entry.ownerName + '"class="ownerName">' + entry.title + '</a>';
    else
       var promotedInfo = '<span class="error">fail in extracting promoted Info</span>';

    return promotedPrefix + '<span class="promoted">' + distance + ' ago, </span>' + promotedInfo;
};

function feedFormat(entry) {
    var distance = moment.duration(moment() - moment(entry.savingTime)).humanize();
    var feedPrefix = '<span class="prefix">⧼ newsfeed</span>';
    return feedPrefix + '<span class="feed">Saved ' + distance + ' ago </span>';
};

var currentlyLoaded = 0;
var amount = 50;

function loadHTMLs(userId, containerId) {
    var start = currentlyLoaded;
    currentlyLoaded = (start + amount);
    var url = "/api/v1/personal/htmls/" + userId + '/' + start + '/' + amount;
    $.getJSON(url, function(collection) {
        _.each(collection, function(entry, i) {
        
            var prettyHtml = '<a href="/revision/' + entry.id + '" target="_blank">🔗 original </a>';
            
            if(entry.type === 'promoted')
                prettyHtml += promotedFormat(entry);
            else
                prettyHtml += feedFormat(entry);

            $(containerId).append('<div class="entry">' + '<span class="num">' + (i + 1 + start) + '</span>' + prettyHtml + '</div>');
        });
        if(_.size(collection) != amount)
            $('#shiftContributionBlock').hide();
    });
};

function loadProfile(userId, containerId) {
    var url = "/api/v1/personal/profile/" + userId;
    $.getJSON(url, function(collection) {
        _.each(collection, function(entry, i) {
            $(containerId).append(
                '<b> Key #'
                + (i + 1) + '</b>'
                + '<pre>'
                + JSON.stringify(entry, undefined, 2)
                + '</pre>'
            );
        });
    });
};
