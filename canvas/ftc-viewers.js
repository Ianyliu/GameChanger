$(document).ready(function () {

    var TESTING = false;

    if (TESTING===false) {
        var content = $("#wiki_page_show");
        if (content.length < 1) return;

        var observerConfig = {
            attributes: true,
            childList: false,
            subtree: true,
            characterData: false
        };

        var iSeen = 0;
        var contentObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                var newVal = $(mutation.target).prop(mutation.attributeName);
                if (mutation.attributeName === "class" && newVal === "show-content user_content clearfix enhanced") {
                    iSeen++;
                    if (iSeen === 2)  $(document).trigger('all_contents_loaded_now');
                };
            });
        });

        contentObserver.observe(content[content.length - 1], observerConfig);
    };

    var isdone = false;

    $(document).on('all_contents_loaded_now', function() {

        if (TESTING===false) contentObserver.disconnect();

        if (isdone) return; //we do this only once
        isdone = true;

        var iCounter = 0;
        var audioPlayer = null;
        var vplayerloaded = false;
        var aplayerloaded = false;
        var vplayer_w = 720, vplayer_h = 520; //track video player size

        //file ext, works with 'file, file.docx.pdf, ../dir/dir/file.ext, http://.../file.ext?do=preview, etc
        function getfext(url) {
            var b = '';
            var a = url.split('.');
            if (!(a.length === 1 || (a[0] === '' && a.length === 2))) {
                b = a.pop().toLowerCase();
            };
            return /^(.*?)([^a-zA-Z0-9]|$)/.exec(b)[1];
        };

        //filetype for flowplayer etc
        function getftype(filename) {
            var b = getfext(filename); //original file extension
            var c = 'unknown'; //media type: video, audio, image, doc
            var d = 'unknown'; //encoder type
            if (b == 'mp4' || b == 'm4v' || b == 'mov' ) {c = 'video'; d = 'mp4';}
            else if (b == 'm4a' || b == 'acc' || b == 'mp3' ) {c = 'audio'; d = 'mp3';}
            else if (b == 'flv' || b == 'f4v') { c = 'video'; d = 'flash'; }
            else if (b == 'f4a') { c = 'audio'; d = 'flash'; }
            else if (b == 'webm') { c = 'video'; d = 'webm'; }
            else if (b == 'ogg') { c = 'video'; d = 'ogg'; }
            else if (b == 'oga') { c = 'audio'; d = 'ogg'; }
            else if (b == 'txt' || b == 'htm' || b == 'html') { c = 'doc'; d = 'txt'; }
            else if (b == 'pdf' || b == 'odt' || b == 'odp' || b == 'ods') { c = 'doc'; d = 'pdf'; }
            else if (b == 'docx' || b == 'doc' || b == 'ppt' || b == 'pptx' || b == 'xlsx' || b == 'xls') { c = 'doc'; d = 'doc'; }
            else if (b == 'jpg' || b == 'gif' || b == 'png') { c = 'image'; d = 'jpg'; }
            else if (b == 'swf') { c = 'image'; d = 'swf'; }
            //alert(filename + ': '+ b+': '+ c + ': ' + d);
            return {ext: b, media: c, encoder: d};
        };

        loadCSS = function(href) {
            var cssLink = $("<link rel='stylesheet' type='text/css' href='"+href+"'>");
            $("head").append(cssLink);
        };

        loadJS = function(src) {
            var jsLink = $("<script type='text/javascript' src='"+src+"'>");
            $("head").append(jsLink);
        };

        addCSS = function(src) {
            var cssBlock = $("<style>");
            cssBlock.append(src);
            $("head").append(cssBlock);
        };

        $('span.instructure_file_link_holder').each(function () {

            var obj = $(this);
            if (obj.hasClass('ftc_enhanced')) return; //if it is already done, don't do it again

            var ititle = '',
                ihref = '',
                vhref = '',
                itext = '',
                itype = '', //media type
                ifext = '', //file extension
                ifcat = ''; //file category


            iCounter += 1;

            //Reduce the dialog titile
            //addCSS('.ui-dialog .ui-dialog-titlebar {padding: 0.1em 1em;} .ui-dialog{font-size: 75%;}');
            //addCSS('.ui-dialog-titlebar-close {top: 60%; width: 16px; height: 16px; }');
            //addCSS('.ui-widget-header {background: #aaa;   font-weight: normal;}');
            //jQuery-extend - too big to make it worthwhile
            //loadJS('/ext/jqextend/build/jquery.dialogextend.min.js');

            //Remove the all kaltura boxes, before this, there can be two a.instructure_video_link
            obj.children('a.instructure_inline_media_comment').remove();

            //Get params from the file link
            var filelink = null;
            if ((filelink = obj.children('a.instructure_video_link')).length > 0) itype = 'video';
            else if ((filelink = obj.children('a.instructure_audio_link')).length > 0) itype = 'audio';
            else if ((filelink = obj.children('a.instructure_image_thumbnail')).length > 0) itype = 'image';
            else filelink = obj.children('a[title!="View in a new window"]');

            if (filelink.length > 0) {
                ititle = filelink.first().attr('title'); //filename
                var t = getftype(ititle);
                if (itype == '') itype = t.media; //audio, video, image, doc
                ifext = t.ext; //the original file extension
                ifcat = t.encoder; //mp4, mp3, webm, pdf, htm, etc
                ihref = filelink.first().attr('href'); //download link
                vhref = ihref.replace('download?wrap=1', 'preview'); //preview link
                itext = filelink.first().text(); //link text
                //console.log(itype, itext);
            } else {
                $(this).addClass('ftc_enhanced');
                return true; //true: break out this .each; do next. false: terminate the .each loop too
            }

            //alert(ititle+': '+ itype + ': ' + ifcat);

            // Remove everything, incluing the file link.
            obj.empty();


            // We construct three viewers, for videos, documents, and images. The can appear simulateously. But each type of player only has one instance.

            if (iCounter == 1) {
                obj.append('<div id="d_docviewer" style="display: none" ></div>');
                obj.append('<div id="d_imageviewer" style="display: none" ></div>');
                obj.append('<div id="d_videoplayer" style="display: none" ></div>');

                if (itype == 'video') {
                    addCSS('video { object-fit: cover; }');
                }

                $('#d_docviewer')
                    .dialog({
                        autoOpen: false,
                        resizable: true,
                        show: 'scale',
                        hide: 'scale',
                        width: 720,
                        height: 600,
                        modal: false,
                        position: ["center", 100],
                        title: "Doc Viewer"
                    });

                $('#d_imageviewer')
                    .dialog({
                        autoOpen: false,
                        resizable: true,
                        show: 'scale',
                        hide: 'scale',
                        width: 500,
                        height: 500,
                        modal: false,
                        position: ["center", 150],
                        title: "Image Viewer",
                        close: function () {
                            $(this).html(''); //clear the content in case it is a swf playing
                        }
                    });


                $('#d_videoplayer')
                    .dialog({
                        autoOpen: false,
                        resizable: true,
                        show: 'scale',
                        hide: 'scale',
                        width: vplayer_w,
                        height: vplayer_h,
                        modal: false,
                        position: ["center", 50],
                        title: "Video Player",
                        close: function () {
                            $(this).html(''); //clear the content in case it is a swf playing
                        }
                    });

            };

            //the buttons - playbt and viewbt share the same id
            var playbt = '<img id="button' + iCounter + '" src="/ext/playbutton.png" width="16px" title="Play" style="cursor:pointer">';
            var viewbt = '<img id="button' + iCounter + '" src="/ext/viewbutton.png" width="16px" title="View" style="cursor:pointer">';
            var savebt = '<a href="' + ihref + '"><img id="savebt' + iCounter + '" src="/ext/savebutton.png" width="16px" title="Download" style="cursor:pointer"></a>';

            var isrc = '';
            var viewer = '';

            if (itype == 'video') {
                viewer = '#d_videoplayer';
                obj.append(itext + " " + playbt + " " + savebt);
                isrc = '<div id="vplayer'+iCounter+'" style="width:100%; height:100%;">'
                    + '<video autoplay controls width="100%" height="auto"> <source type="video/'+ ifcat + '"  src="' + vhref + '"> <\/video>'
                    + '<\/div>';
            } else if (itype == 'audio') { //inplace player
                viewer = '#d_audioplayer';
                obj.append(itext + " " + playbt + " " + savebt + '<div id="audiod' + iCounter + '" style="display:none">'
                    +'<audio controls id="audiop' + iCounter + '" style="width: 320px;"><source src="' + vhref + '"></audio></div>' );
                isrc = '';
            } else if (itype == 'image') {
                viewer = '#d_imageviewer'; //inplace player, undefined yet
                obj.append(itext + " " + viewbt + " " + savebt);
                if (ifcat == 'swf') {
                    isrc = '<iframe width="100%" height="100%" src="' + vhref + '"></iframe>';
                } else {
                    isrc = '<img src="' + vhref + '" style="max-width:100%;" />';
                }
            } else if (itype == 'doc') {
                viewer = '#d_docviewer';
                obj.append(itext + " " + viewbt + " " + savebt);
                if (ifcat == 'pdf') {
                    isrc = '<iframe width="100%" height="100%" src="' + '/ext/ViewerJS/#' + vhref + '.' + ifext + '"></iframe>'; //should be the ext of ititle;
                } else if (ifcat == 'txt') {
                    isrc = '<iframe width="100%" height="100%" src="' + vhref + '"></iframe>';
                } else {
                    itype = 'unknown';
                }
            } else {
                obj.append(itext + " " + viewbt + " " + savebt);
                viewer = '#d_imageviewer';
            }

            if (viewer != '' ) {
                var button = $('#button' + iCounter);
                button.click(function () {
                    if (itype == 'unknown') { //unhandled type
                        alert('Viewing this document type is not supported. \nPlease download the file and view it locally, or\n request the author to upload a pdf, mp4, mp3, png, or jpg file.');
                    } else if (itype == 'audio') { //audio, inplace player
                        var div = $('#'+$(this).attr('id').replace('button', 'audiod')); //the holder
                        var ply = $('#'+$(this).attr('id').replace('button', 'audiop')); //the player
                        if (div.is(':visible')) ply[0].pause(); else ply[0].play();
                        div.toggle();
                    } else {
                        var v= $(viewer);
                        v.html(isrc);
                        v.dialog('option', 'title', itext);
                        v.dialog('open');
                    };
                });
            }
            $(this).addClass('ftc_enhanced');
        }); //span.each function
    }); //on('')
    if (TESTING) $(document).trigger('all_contents_loaded_now');
}); //doc.ready