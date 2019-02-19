/**
 * jQuery Lined Textarea Plugin 
 *   http://alan.blog-city.com/jquerylinedtextarea.htm
 *
 * Copyright (c) 2010 Alan Williamson
 * 
 * This version contains improvement for working with a 
 * large number of lines.
 *
 * Available at
 * 		https://github.com/cotenoni/jquery-linedtextarea
 * 
 * Version: 
 *    $Id: jquery-linedtextarea.js 464 2010-01-08 10:36:33Z alan $
 *
 * Released under the MIT License:
 *    http://www.opensource.org/licenses/mit-license.php
 * 
 * Usage:
 *   Displays a line number count column to the left of the textarea
 *   
 *   Class up your textarea with a given class, or target it directly
 *   with JQuery Selectors
 *   
 *   $(".lined").linedtextarea({
 *   	selectedLine: 10,
 *    selectedClass: 'lineselect'
 *   });
 *
 * History:
 * 	 - 2010.02.20: Fixed performance problem with high numbers of line
 *   - 2010.01.08: Fixed a Google Chrome layout problem
 *   - 2010.01.07: Refactored code for speed/readability; Fixed horizontal sizing
 *   - 2010.01.06: Initial Release
 *
 */
(function($) {

	$.fn.linedtextarea = function(options) {
		
		// Get the Options
		var opts = $.extend({}, $.fn.linedtextarea.defaults, options);
		var LINEHEIGHT = 15;
		
		
		/*
		 * Helper function to make sure the line numbers are always
		 * kept up to the current system
		 */
		var fillOutLines = function(codeLines, h, lineNo){
			while ( (codeLines.height() - h ) <= 0 ){
                if (opts.dec) {
                    var disp = ("0000" + (lineNo)).slice(-4);
                    var prefix = "";
                } else {
                    var disp = ("0000" + (lineNo-1).toString(16)).slice(-4);
                    var prefix = "0x";
                }
                try {
                    if (g_line == lineNo) {
                    codeLines.append("<div class='lineno lineselect'>" + prefix + disp + "</div>");
                    } else {
                    codeLines.append("<div class='lineno'>" + prefix + disp + "</div>");
                    }
                } catch (err) {
                    codeLines.append("<div class='lineno'>" + prefix + disp + "</div>");
                }
				lineNo++;
			}
			return lineNo;
		};
		
		
		/*
		 * Iterate through each of the elements are to be applied to
		 */
		return this.each(function() {
			var lineNo = 1;
			var textarea = $(this);
			
			/* Turn off the wrapping of as we don't want to screw up the line numbers */
			textarea.attr("wrap", "off");
			textarea.css({resize:'none'});
			var originalTextAreaWidth	= textarea.outerWidth();

			/* Wrap the text area in the elements we need */
			textarea.wrap("<div class='linedtextarea'></div>");
			var linedTextAreaDiv	= textarea.parent().wrap("<div class='linedwrap' style='width:" + originalTextAreaWidth + "px'></div>");
			var linedWrapDiv 			= linedTextAreaDiv.parent();
			
            if (opts.dec){
                linedWrapDiv.prepend("<div class='lines' style='width:45px'></div>");
            } else {
                linedWrapDiv.prepend("<div class='lines' style='width:60px'></div>");
            }
			
			
			var linesDiv	= linedWrapDiv.find(".lines");
			linesDiv.height( textarea.height() + 6 );
			
			
			/* Draw the number bar; filling it out where necessary */
			linesDiv.append( "<div class='codelines'></div>" );
			var codeLinesDiv	= linesDiv.find(".codelines");
			lineNo = fillOutLines( codeLinesDiv, linesDiv.height(), 1 );

			/* Move the textarea to the selected line */ 
			if ( opts.selectedLine != -1 && !isNaN(opts.selectedLine) ){
				var fontSize = parseInt( textarea.height() / (lineNo-2) );
				var position = parseInt( fontSize * opts.selectedLine ) - (textarea.height()/2);
				textarea[0].scrollTop = position;
			}


			/* Set the width */
			var sidebarWidth					= linesDiv.outerWidth();
			var paddingHorizontal 		= parseInt( linedWrapDiv.css("border-left-width") ) + parseInt( linedWrapDiv.css("border-right-width") ) + parseInt( linedWrapDiv.css("padding-left") ) + parseInt( linedWrapDiv.css("padding-right") );
			var linedWrapDivNewWidth 	= originalTextAreaWidth - paddingHorizontal;
			var textareaNewWidth			= originalTextAreaWidth - sidebarWidth - paddingHorizontal - 20;

			textarea.width( textareaNewWidth );
			linedWrapDiv.width( linedWrapDivNewWidth );
			
			/* React to the scroll event */
			var tid = null;
			textarea.scroll( function(tn){
				if (tid === null) {
					var that = this;
					
					// We use a timeout as to avoid appending/redrawing
					// the div on every scroll event. This does add some latency
					// before the right line number is displayed, but makes possible
					// scrolling with a very high number of lines
					tid = requestAnimationFrame( function() {
						codeLinesDiv.empty();
						
						// Calculare the line numbers to display
						var domTextArea			= $(that)[0];
						var scrollTop 			= domTextArea.scrollTop;
						var firstLine 			= Math.floor((scrollTop / LINEHEIGHT)) +1;
						var remainingScroll = (scrollTop / LINEHEIGHT) % 1;

						fillOutLines( codeLinesDiv, linesDiv.height(), firstLine);
						codeLinesDiv.css( {'margin-top': (-1*(remainingScroll*LINEHEIGHT)) + "px"} );
						tid=null;
					});
				}
			});


			/* Should the textarea get resized outside of our control */
			textarea.resize( function(tn){
				var domTextArea	= $(this)[0];
				linesDiv.height( domTextArea.clientHeight + 6 );
			});

		});
	};

  // default options
  $.fn.linedtextarea.defaults = {
  	selectedLine: -1,
  	selectedClass: 'lineselect'
  };
})(jQuery);
