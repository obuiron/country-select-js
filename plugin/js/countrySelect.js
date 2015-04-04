// wrap in UMD - see https://github.com/umdjs/umd/blob/master/jqueryPlugin.js
(function(factory) {
	if (typeof define === "function" && define.amd) {
		define([ "jquery" ], function($) {
			factory($, window, document);
		});
	} else {
		factory(jQuery, window, document);
	}
})(function($, window, document, undefined) {
	"use strict";
	var pluginName = "countrySelect", id = 1, // give each instance its own ID for namespaced event handling
		defaults = {
			// Default country
			defaultCountry: "",
			// Position the selected flag inside or outside of the input
			defaultStyling: "inside",
			// Display only these countries
			onlyCountries: [],
			// The countries at the top of the list. Defaults to United States and United Kingdom
			preferredCountries: [ "us", "gb" ]
		}, keys = {
			UP: 38,
			DOWN: 40,
			ENTER: 13,
			ESC: 27,
			PLUS: 43,
			A: 65,
			Z: 90
		}, windowLoaded = false;
	// keep track of if the window.load event has fired as impossible to check after the fact
	$(window).load(function() {
		windowLoaded = true;
	});
	function Plugin(element, options) {
		this.element = element;
		this.options = $.extend({}, defaults, options);
		this._defaults = defaults;
		// event namespace
		this.ns = "." + pluginName + id++;
		this._name = pluginName;
		this.init();
	}
	Plugin.prototype = {
		init: function() {
			// Process all the data: onlyCounties, preferredCountries, defaultCountry etc
			this._processCountryData();
			// Generate the markup
			this._generateMarkup();
			// Set the initial state of the input value and the selected flag
			this._setInitialState();
			// Start all of the event listeners: input keyup, selectedFlag click
			this._initListeners();
		},
		/********************
		 *  PRIVATE METHODS
		 ********************/
		// prepare all of the country data, including onlyCountries, preferredCountries and
		// defaultCountry options
		_processCountryData: function() {
			// set the instances country data objects
			this._setInstanceCountryData();
			// set the preferredCountries property
			this._setPreferredCountries();
		},
		// process onlyCountries array if present
		_setInstanceCountryData: function() {
			var that = this;
			if (this.options.onlyCountries.length) {
				var newCountries = [];
				$.each(this.options.onlyCountries, function(i, countryCode) {
					var countryData = that._getCountryData(countryCode, true);
					if (countryData) {
						newCountries.push(countryData);
					}
				});
				this.countries = newCountries;
			} else {
				this.countries = allCountries;
			}
		},
		// Process preferred countries - iterate through the preferences,
		// fetching the country data for each one
		_setPreferredCountries: function() {
			var that = this;
			this.preferredCountries = [];
			$.each(this.options.preferredCountries, function(i, countryCode) {
				var countryData = that._getCountryData(countryCode, false);
				if (countryData) {
					that.preferredCountries.push(countryData);
				}
			});
		},
		// generate all of the markup for the plugin: the selected flag overlay, and the dropdown
		_generateMarkup: function() {
			// Country input
			this.countryInput = $(this.element);
			// containers (mostly for positioning)
			var mainClass = "country-select";
			if (this.options.defaultStyling) {
				mainClass += " " + this.options.defaultStyling;
			}
			this.countryInput.wrap($("<div>", {
				"class": mainClass
			}));
			var flagsContainer = $("<div>", {
				"class": "flag-dropdown"
			}).insertAfter(this.countryInput);
			// currently selected flag (displayed to left of input)
			var selectedFlag = $("<div>", {
				"class": "selected-flag"
			}).appendTo(flagsContainer);
			this.selectedFlagInner = $("<div>", {
				"class": "flag"
			}).appendTo(selectedFlag);
			// CSS triangle
			$("<div>", {
				"class": "arrow"
			}).appendTo(this.selectedFlagInner);
			// country list contains: preferred countries, then divider, then all countries
			this.countryList = $("<ul>", {
				"class": "country-list v-hide"
			}).appendTo(flagsContainer);
			if (this.preferredCountries.length) {
				this._appendListItems(this.preferredCountries, "preferred");
				$("<li>", {
					"class": "divider"
				}).appendTo(this.countryList);
			}
			this._appendListItems(this.countries, "");
			// Add the hidden input for the country code
			this.countryCodeInput = $("#"+this.countryInput.attr("id")+"_code");
			if (!this.countryCodeInput) {
				this.countryCodeInput = $('<input type="hidden" id="'+this.countryInput.attr("id")+'_code" name="'+this.countryInput.attr("name")+'_code" value="" />');
				this.countryCodeInput.insertAfter(this.countryInput);
			}
			// Add the hiddent input for the long country code
			this.longCountryCodeInput = $("#"+this.countryInput.attr("id")+"_long_code");
			if (!this.longCountryCodeInput) {
				this.longCountryCodeInput = $('<input type="hidden" id="'+this.countryInput.attr("id")+'_long_code" name="'+this.countryInput.attr("name")+'_long_code" value="" />');
				this.longCountryCodeInput.insertAfter(this.countryCodeInput);
			}
			// now we can grab the dropdown height, and hide it properly
			this.dropdownHeight = this.countryList.outerHeight();
			this.countryList.removeClass("v-hide").addClass("hide");
			// this is useful in lots of places
			this.countryListItems = this.countryList.children(".country");
		},
		// add a country <li> to the countryList <ul> container
		_appendListItems: function(countries, className) {
			// Generate DOM elements as a large temp string, so that there is only
			// one DOM insert event
			var tmp = "";
			// for each country
			$.each(countries, function(i, c) {
				// open the list item
				tmp += '<li class="country ' + className + '" data-country-code="' + c.iso2 + '">';
				// add the flag
				tmp += '<div class="flag ' + c.iso2 + '"></div>';
				// and the country name
				tmp += '<span class="country-name">' + c.name + '</span>';
				// close the list item
				tmp += '</li>';
			});
			this.countryList.append(tmp);
		},
		// set the initial state of the input value and the selected flag
		_setInitialState: function() {
			var flagIsSet = false;
			// If the input is pre-populated, then just update the selected flag
			if (this.countryInput.val()) {
				flagIsSet = this._updateFlagFromInputVal();
			}
			// If the country code input is pre-populated, update the name and the selected flag
			var selectedCode = this.countryCodeInput.val();
			if (selectedCode) {
				this.selectCountry(selectedCode);
			}
			if (!flagIsSet) {
				// flag is not set, so set to the default country
				var defaultCountry;
				// check the defaultCountry option, else fall back to the first in the list
				if (this.options.defaultCountry) {
					defaultCountry = this._getCountryData(this.options.defaultCountry, false);
				} else {
					defaultCountry = this.preferredCountries.length ? this.preferredCountries[0] : this.countries[0];
				}
				this.selectCountry(defaultCountry.iso2);
			}
		},
		// initialise the main event listeners: input keyup, and click selected flag
		_initListeners: function() {
			var that = this;
			// Update flag on keyup.
			// Use keyup instead of keypress because we want to update on backspace
			// and instead of keydown because the value hasn't updated when that
			// event is fired.
			// NOTE: better to have this one listener all the time instead of
			// starting it on focus and stopping it on blur, because then you've
			// got two listeners (focus and blur)
			this.countryInput.on("keyup" + this.ns, function() {
				that._updateFlagFromInputVal();
			});
			// toggle country dropdown on click
			var selectedFlag = this.selectedFlagInner.parent();
			selectedFlag.on("click" + this.ns, function(e) {
				// only intercept this event if we're opening the dropdown
				// else let it bubble up to the top ("click-off-to-close" listener)
				// we cannot just stopPropagation as it may be needed to close another instance
				if (that.countryList.hasClass("hide") && !that.countryInput.prop("disabled")) {
					that._showDropdown();
				}
			});
		},
		// Focus input and put the cursor at the end
		_focus: function() {
			this.countryInput.focus();
			var input = this.countryInput[0];
			// works for Chrome, FF, Safari, IE9+
			if (input.setSelectionRange) {
				var len = this.countryInput.val().length;
				input.setSelectionRange(len, len);
			}
		},
		// Show the dropdown
		_showDropdown: function() {
			this._setDropdownPosition();
			// update highlighting and scroll to active list item
			var activeListItem = this.countryList.children(".active");
			this._highlightListItem(activeListItem);
			// show it
			this.countryList.removeClass("hide");
			this._scrollTo(activeListItem);
			// bind all the dropdown-related listeners: mouseover, click, click-off, keydown
			this._bindDropdownListeners();
			// update the arrow
			this.selectedFlagInner.children(".arrow").addClass("up");
		},
		// decide where to position dropdown (depends on position within viewport, and scroll)
		_setDropdownPosition: function() {
			var inputTop = this.countryInput.offset().top, windowTop = $(window).scrollTop(),
				dropdownFitsBelow = inputTop + this.countryInput.outerHeight() + this.dropdownHeight < windowTop + $(window).height(), dropdownFitsAbove = inputTop - this.dropdownHeight > windowTop;
			// dropdownHeight - 1 for border
			var cssTop = !dropdownFitsBelow && dropdownFitsAbove ? "-" + (this.dropdownHeight - 1) + "px" : "";
			this.countryList.css("top", cssTop);
		},
		// we only bind dropdown listeners when the dropdown is open
		_bindDropdownListeners: function() {
			var that = this;
			// when mouse over a list item, just highlight that one
			// we add the class "highlight", so if they hit "enter" we know which one to select
			this.countryList.on("mouseover" + this.ns, ".country", function(e) {
				that._highlightListItem($(this));
			});
			// listen for country selection
			this.countryList.on("click" + this.ns, ".country", function(e) {
				that._selectListItem($(this));
			});
			// click off to close
			// (except when this initial opening click is bubbling up)
			// we cannot just stopPropagation as it may be needed to close another instance
			var isOpening = true;
			$("html").on("click" + this.ns, function(e) {
				if (!isOpening) {
					that._closeDropdown();
				}
				isOpening = false;
			});
			// Listen for up/down scrolling, enter to select, or letters to jump to country name.
			// Use keydown as keypress doesn't fire for non-char keys and we want to catch if they
			// just hit down and hold it to scroll down (no keyup event).
			// Listen on the document because that's where key events are triggered if no input has focus
			$(document).on("keydown" + this.ns, function(e) {
				// prevent down key from scrolling the whole page,
				// and enter key from submitting a form etc
				e.preventDefault();
				if (e.which == keys.UP || e.which == keys.DOWN) {
					// up and down to navigate
					that._handleUpDownKey(e.which);
				} else if (e.which == keys.ENTER) {
					// enter to select
					that._handleEnterKey();
				} else if (e.which == keys.ESC) {
					// esc to close
					that._closeDropdown();
				} else if (e.which >= keys.A && e.which <= keys.Z) {
					// upper case letters (note: keyup/keydown only return upper case letters)
					// cycle through countries beginning with that letter
					that._handleLetterKey(e.which);
				}
			});
		},
		// Highlight the next/prev item in the list (and ensure it is visible)
		_handleUpDownKey: function(key) {
			var current = this.countryList.children(".highlight").first();
			var next = key == keys.UP ? current.prev() : current.next();
			if (next.length) {
				// skip the divider
				if (next.hasClass("divider")) {
					next = key == keys.UP ? next.prev() : next.next();
				}
				this._highlightListItem(next);
				this._scrollTo(next);
			}
		},
		// select the currently highlighted item
		_handleEnterKey: function() {
			var currentCountry = this.countryList.children(".highlight").first();
			if (currentCountry.length) {
				this._selectListItem(currentCountry);
			}
		},
		// Iterate through the countries starting with the given letter
		_handleLetterKey: function(key) {
			var letter = String.fromCharCode(key);
			// filter out the countries beginning with that letter
			var countries = this.countryListItems.filter(function() {
				return $(this).text().charAt(0) == letter && !$(this).hasClass("preferred");
			});
			if (countries.length) {
				// if one is already highlighted, then we want the next one
				var highlightedCountry = countries.filter(".highlight").first(), listItem;
				// if the next country in the list also starts with that letter
				if (highlightedCountry && highlightedCountry.next() && highlightedCountry.next().text().charAt(0) == letter) {
					listItem = highlightedCountry.next();
				} else {
					listItem = countries.first();
				}
				// update highlighting and scroll
				this._highlightListItem(listItem);
				this._scrollTo(listItem);
			}
		},
		// Update the selected flag using the input's current value
		_updateFlagFromInputVal: function() {
			var that = this;
			// try and extract valid dial code from input
			var value = this.countryInput.val();
			if (value) {
				var countryCodes = [];
				var matcher = new RegExp("^"+value, "i");
				for (var i =0; i < this.countries.length; i++) {
					if (this.countries[i].name.match(matcher)) {
						countryCodes.push(this.countries[i].iso2);
					}
				}
				// Check if one of the matching countries is already selected
				var alreadySelected = false;
				$.each(countryCodes, function(i, c) {
					if (that.selectedFlagInner.hasClass(c)) {
						alreadySelected = true;
					}
				});
				if (!alreadySelected) {
					this._selectFlag(countryCodes[0]);
				}
				// Matching country found
				return true;
			}
			// No match found
			return false;
		},
		// remove highlighting from other list items and highlight the given item
		_highlightListItem: function(listItem) {
			this.countryListItems.removeClass("highlight");
			listItem.addClass("highlight");
		},
		// find the country data for the given country code
		// the ignoreOnlyCountriesOption is only used during init() while parsing the onlyCountries array
		_getCountryData: function(countryCode, ignoreOnlyCountriesOption) {
			var countryList = ignoreOnlyCountriesOption ? allCountries : this.countries;
			for (var i = 0; i < countryList.length; i++) {
				if (countryList[i].iso2 == countryCode) {
					return countryList[i];
				}
			}
			return null;
		},
		// update the selected flag and the active list item
		_selectFlag: function(countryCode) {
			if (! countryCode) {
				return false;
			}
			this.selectedFlagInner.attr("class", "flag " + countryCode);
			// update the title attribute
			var countryData = this._getCountryData(countryCode);
			this.selectedFlagInner.parent().attr("title", countryData.name);
			// update the active list item
			var listItem = this.countryListItems.children(".flag." + countryCode).first().parent();
			this.countryListItems.removeClass("active");
			listItem.addClass("active");
		},
		// called when the user selects a list item from the dropdown
		_selectListItem: function(listItem) {
			// update selected flag and active list item
			var countryCode = listItem.attr("data-country-code");
			this._selectFlag(countryCode);
			this._closeDropdown();
			// update input value
			this._updateName(countryCode);
			this.countryInput.trigger("change");
			this.countryCodeInput.trigger("change");
			this.longCountryCodeInput.trigger("change");
			// focus the input
			this._focus();
		},
		// close the dropdown and unbind any listeners
		_closeDropdown: function() {
			this.countryList.addClass("hide");
			// update the arrow
			this.selectedFlagInner.children(".arrow").removeClass("up");
			// unbind event listeners
			$(document).off("keydown" + this.ns);
			$("html").off("click" + this.ns);
			// unbind both hover and click listeners
			this.countryList.off(this.ns);
		},
		// check if an element is visible within its container, else scroll until it is
		_scrollTo: function(element) {
			var container = this.countryList, containerHeight = container.height(), containerTop = container.offset().top, containerBottom = containerTop + containerHeight, elementHeight = element.outerHeight(), elementTop = element.offset().top, elementBottom = elementTop + elementHeight, newScrollTop = elementTop - containerTop + container.scrollTop();
			if (elementTop < containerTop) {
				// scroll up
				container.scrollTop(newScrollTop);
			} else if (elementBottom > containerBottom) {
				// scroll down
				var heightDifference = containerHeight - elementHeight;
				container.scrollTop(newScrollTop - heightDifference);
			}
		},
		// Replace any existing country name with the new one
		_updateName: function(countryCode) {
			this.countryCodeInput.val(countryCode);
			this.longCountryCodeInput.val(this._getCountryData(countryCode).iso3)
			this.countryInput.val(this._getCountryData(countryCode).name);
		},
		/********************
		 *  PUBLIC METHODS
		 ********************/
		// get the country data for the currently selected flag
		getSelectedCountryData: function() {
			// rely on the fact that we only set 2 classes on the selected flag element:
			// the first is "flag" and the second is the 2-char country code
			var countryCode = this.selectedFlagInner.attr("class").split(" ")[1];
			return this._getCountryData(countryCode);
		},
		// update the selected flag
		selectCountry: function(countryCode) {
			// check if already selected
			if (!this.selectedFlagInner.hasClass(countryCode)) {
				this._selectFlag(countryCode);
				this._updateName(countryCode);
			}
		},
		// set the input value and update the flag
		setCountry: function(country) {
			this.countryInput.val(country);
			this._updateFlagFromInputVal();
		},
		// remove plugin
		destroy: function() {
			// stop listeners
			this.countryInput.off(this.ns);
			this.selectedFlagInner.parent().off(this.ns);
			// remove markup
			var container = this.countryInput.parent();
			container.before(this.countryInput).remove();
		}
	};
	// adapted to allow public functions
	// using https://github.com/jquery-boilerplate/jquery-boilerplate/wiki/Extending-jQuery-Boilerplate
	$.fn[pluginName] = function(options) {
		var args = arguments;
		// Is the first parameter an object (options), or was omitted,
		// instantiate a new instance of the plugin.
		if (options === undefined || typeof options === "object") {
			return this.each(function() {
				if (!$.data(this, "plugin_" + pluginName)) {
					$.data(this, "plugin_" + pluginName, new Plugin(this, options));
				}
			});
		} else if (typeof options === "string" && options[0] !== "_" && options !== "init") {
			// If the first parameter is a string and it doesn't start
			// with an underscore or "contains" the `init`-function,
			// treat this as a call to a public method.
			// Cache the method call to make it possible to return a value
			var returns;
			this.each(function() {
				var instance = $.data(this, "plugin_" + pluginName);
				// Tests that there's already a plugin-instance
				// and checks that the requested public method exists
				if (instance instanceof Plugin && typeof instance[options] === "function") {
					// Call the method of our plugin instance,
					// and pass it the supplied arguments.
					returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
				}
				// Allow instances to be destroyed via the 'destroy' method
				if (options === "destroy") {
					$.data(this, "plugin_" + pluginName, null);
				}
			});
			// If the earlier cached method gives a value back return the value,
			// otherwise return this to preserve chainability.
			return returns !== undefined ? returns : this;
		}
	};
	/********************
	 *  STATIC METHODS
	 ********************/
		// get the country data object
	$.fn[pluginName].getCountryData = function() {
		return allCountries;
	};
	// set the country data object
	$.fn[pluginName].setCountryData = function(obj) {
		allCountries = obj;
	};
	// Tell JSHint to ignore this warning: "character may get silently deleted by one or more browsers"
	// jshint -W100
	// Array of country objects for the flag dropdown.
	// Each contains a name and country code (ISO 3166-1 alpha-2 & ISO 3166-1 alpha-3).
	//
	// Note: using single char property names to keep filesize down
	// n = name
	// i = iso2 (2-char country code)
	// z = iso3 (3-char country code)
	var allCountries = $.each([
		{ i: "af", z: "afg", n: "Afghanistan (‫افغانستان‬‎)" },
		{ i: "ax", z: "ala", n: "Åland Islands (Åland)" },
		{ i: "al", z: "alb", n: "Albania (Shqipëri)" },
		{ i: "dz", z: "dza", n: "Algeria (‫الجزائر‬‎)" },
		{ i: "as", z: "asm", n: "American Samoa" },
		{ i: "ad", z: "and", n: "Andorra" },
		{ i: "ao", z: "ago", n: "Angola" },
		{ i: "ai", z: "aia", n: "Anguilla" },
		{ i: "ag", z: "atg", n: "Antigua and Barbuda" },
		{ i: "ar", z: "arg", n: "Argentina" },
		{ i: "am", z: "arm", n: "Armenia (Հայաստան)" },
		{ i: "aw", z: "abw", n: "Aruba" },
		{ i: "au", z: "aus", n: "Australia" },
		{ i: "at", z: "aut", n: "Austria (Österreich)" },
		{ i: "az", z: "aze", n: "Azerbaijan (Azərbaycan)" },
		{ i: "bs", z: "bhs", n: "Bahamas" },
		{ i: "bh", z: "bhr", n: "Bahrain (‫البحرين‬‎)" },
		{ i: "bd", z: "bgd", n: "Bangladesh (বাংলাদেশ)" },
		{ i: "bb", z: "brb", n: "Barbados" },
		{ i: "by", z: "blr", n: "Belarus (Беларусь)" },
		{ i: "be", z: "bel", n: "Belgium (België)" },
		{ i: "bz", z: "blz", n: "Belize" },
		{ i: "bj", z: "ben", n: "Benin (Bénin)" },
		{ i: "bm", z: "bmu", n: "Bermuda" },
		{ i: "bt", z: "btn", n: "Bhutan (འབྲུག)" },
		{ i: "bo", z: "bol", n: "Bolivia" },
		{ i: "ba", z: "bih", n: "Bosnia and Herzegovina (Босна и Херцеговина)" },
		{ i: "bw", z: "bwa", n: "Botswana" },
		{ i: "br", z: "bra", n: "Brazil (Brasil)" },
		{ i: "io", z: "iot", n: "British Indian Ocean Territory" },
		{ i: "vg", z: "vgb", n: "British Virgin Islands" },
		{ i: "bn", z: "brn", n: "Brunei" },
		{ i: "bg", z: "bgr", n: "Bulgaria (България)" },
		{ i: "bf", z: "bfa", n: "Burkina Faso" },
		{ i: "bi", z: "bdi", n: "Burundi (Uburundi)" },
		{ i: "kh", z: "khm", n: "Cambodia (កម្ពុជា)" },
		{ i: "cm", z: "cmr", n: "Cameroon (Cameroun)" },
		{ i: "ca", z: "can", n: "Canada" },
		{ i: "cv", z: "cpv", n: "Cape Verde (Kabu Verdi)" },
		{ i: "bq", z: "bes", n: "Caribbean Netherlands" },
		{ i: "ky", z: "cym", n: "Cayman Islands" },
		{ i: "cf", z: "caf", n: "Central African Republic (République Centrafricaine)" },
		{ i: "td", z: "tcd", n: "Chad (Tchad)" },
		{ i: "cl", z: "chl", n: "Chile" },
		{ i: "cn", z: "chn", n: "China (中国)" },
		{ i: "cx", z: "cxr", n: "Christmas Island" },
		{ i: "cc", z: "cck", n: "Cocos (Keeling) Islands (Kepulauan Cocos (Keeling))" },
		{ i: "co", z: "col", n: "Colombia" },
		{ i: "km", z: "com", n: "Comoros (‫جزر القمر‬‎)" },
		{ i: "cd", z: "cod", n: "Congo (DRC) (Jamhuri ya Kidemokrasia ya Kongo)" },
		{ i: "cg", z: "cog", n: "Congo (Republic) (Congo-Brazzaville)" },
		{ i: "ck", z: "cok", n: "Cook Islands" },
		{ i: "cr", z: "cri", n: "Costa Rica" },
		{ i: "ci", z: "civ", n: "Côte d’Ivoire" },
		{ i: "hr", z: "hrv", n: "Croatia (Hrvatska)" },
		{ i: "cu", z: "cub", n: "Cuba" },
		{ i: "cw", z: "cuw", n: "Curaçao" },
		{ i: "cy", z: "cyp", n: "Cyprus (Κύπρος)" },
		{ i: "cz", z: "cze", n: "Czech Republic (Česká republika)" },
		{ i: "dk", z: "dnk", n: "Denmark (Danmark)" },
		{ i: "dj", z: "dji", n: "Djibouti" },
		{ i: "dm", z: "dma", n: "Dominica" },
		{ i: "do", z: "dom", n: "Dominican Republic (República Dominicana)" },
		{ i: "ec", z: "ecu", n: "Ecuador" },
		{ i: "eg", z: "egy", n: "Egypt (‫مصر‬‎)" },
		{ i: "sv", z: "slv", n: "El Salvador" },
		{ i: "gq", z: "gnq", n: "Equatorial Guinea (Guinea Ecuatorial)" },
		{ i: "er", z: "eri", n: "Eritrea" },
		{ i: "ee", z: "est", n: "Estonia (Eesti)" },
		{ i: "et", z: "eth", n: "Ethiopia" },
		{ i: "fk", z: "flk", n: "Falkland Islands (Islas Malvinas)" },
		{ i: "fo", z: "fro", n: "Faroe Islands (Føroyar)" },
		{ i: "fj", z: "fji", n: "Fiji" },
		{ i: "fi", z: "fin", n: "Finland (Suomi)" },
		{ i: "fr", z: "fra", n: "France" },
		{ i: "gf", z: "guf", n: "French Guiana (Guyane française)" },
		{ i: "pf", z: "pyf", n: "French Polynesia (Polynésie française)" },
		{ i: "ga", z: "gab", n: "Gabon" },
		{ i: "gm", z: "gmb", n: "Gambia" },
		{ i: "ge", z: "geo", n: "Georgia (საქართველო)" },
		{ i: "de", z: "deu", n: "Germany (Deutschland)" },
		{ i: "gh", z: "gha", n: "Ghana (Gaana)" },
		{ i: "gi", z: "gib", n: "Gibraltar" },
		{ i: "gr", z: "grc", n: "Greece (Ελλάδα)" },
		{ i: "gl", z: "grl", n: "Greenland (Kalaallit Nunaat)" },
		{ i: "gd", z: "grd", n: "Grenada" },
		{ i: "gp", z: "glp", n: "Guadeloupe" },
		{ i: "gu", z: "gum", n: "Guam" },
		{ i: "gt", z: "gtm", n: "Guatemala" },
		{ i: "gg", z: "ggy", n: "Guernsey" },
		{ i: "gn", z: "gin", n: "Guinea (Guinée)" },
		{ i: "gw", z: "gnb", n: "Guinea-Bissau (Guiné Bissau)" },
		{ i: "gy", z: "guy", n: "Guyana" },
		{ i: "ht", z: "hti", n: "Haiti" },
		{ i: "hn", z: "hnd", n: "Honduras" },
		{ i: "hk", z: "hkg", n: "Hong Kong (香港)" },
		{ i: "hu", z: "hun", n: "Hungary (Magyarország)" },
		{ i: "is", z: "isl", n: "Iceland (Ísland)" },
		{ i: "in", z: "ind", n: "India (भारत)" },
		{ i: "id", z: "idn", n: "Indonesia" },
		{ i: "ir", z: "irn", n: "Iran (‫ایران‬‎)" },
		{ i: "iq", z: "irq", n: "Iraq (‫العراق‬‎)" },
		{ i: "ie", z: "irl", n: "Ireland" },
		{ i: "im", z: "imn", n: "Isle of Man" },
		{ i: "il", z: "isr", n: "Israel (‫ישראל‬‎)" },
		{ i: "it", z: "ita", n: "Italy (Italia)" },
		{ i: "jm", z: "jam", n: "Jamaica" },
		{ i: "jp", z: "jpn", n: "Japan (日本)" },
		{ i: "je", z: "jey", n: "Jersey" },
		{ i: "jo", z: "jor", n: "Jordan (‫الأردن‬‎)" },
		{ i: "kz", z: "kaz", n: "Kazakhstan (Казахстан)" },
		{ i: "ke", z: "ken", n: "Kenya" },
		{ i: "ki", z: "kir", n: "Kiribati" },
		{ i: "xk", z: "kos", n: "Kosovo (Kosovë)" },
		{ i: "kw", z: "kwt", n: "Kuwait (‫الكويت‬‎)" },
		{ i: "kg", z: "kgz", n: "Kyrgyzstan (Кыргызстан)" },
		{ i: "la", z: "lao", n: "Laos (ລາວ)" },
		{ i: "lv", z: "lva", n: "Latvia (Latvija)" },
		{ i: "lb", z: "lbn", n: "Lebanon (‫لبنان‬‎)" },
		{ i: "ls", z: "lso", n: "Lesotho" },
		{ i: "lr", z: "lbr", n: "Liberia" },
		{ i: "ly", z: "lby", n: "Libya (‫ليبيا‬‎)" },
		{ i: "li", z: "lie", n: "Liechtenstein" },
		{ i: "lt", z: "ltu", n: "Lithuania (Lietuva)" },
		{ i: "lu", z: "lux", n: "Luxembourg" },
		{ i: "mo", z: "mac", n: "Macau (澳門)" },
		{ i: "mk", z: "mkd", n: "Macedonia (FYROM) (Македонија)" },
		{ i: "mg", z: "mdg", n: "Madagascar (Madagasikara)" },
		{ i: "mw", z: "mwi", n: "Malawi" },
		{ i: "my", z: "mys", n: "Malaysia" },
		{ i: "mv", z: "mdv", n: "Maldives" },
		{ i: "ml", z: "mli", n: "Mali" },
		{ i: "mt", z: "mlt", n: "Malta" },
		{ i: "mh", z: "mhl", n: "Marshall Islands" },
		{ i: "mq", z: "mtq", n: "Martinique" },
		{ i: "mr", z: "mrt", n: "Mauritania (‫موريتانيا‬‎)" },
		{ i: "mu", z: "mus", n: "Mauritius (Moris)" },
		{ i: "yt", z: "myt", n: "Mayotte" },
		{ i: "mx", z: "mex", n: "Mexico (México)" },
		{ i: "fm", z: "fsm", n: "Micronesia" },
		{ i: "md", z: "mda", n: "Moldova (Republica Moldova)" },
		{ i: "mc", z: "mco", n: "Monaco" },
		{ i: "mn", z: "mng", n: "Mongolia (Монгол)" },
		{ i: "me", z: "mne", n: "Montenegro (Crna Gora)" },
		{ i: "ms", z: "msr", n: "Montserrat" },
		{ i: "ma", z: "mar", n: "Morocco (‫المغرب‬‎)" },
		{ i: "mz", z: "moz", n: "Mozambique (Moçambique)" },
		{ i: "mm", z: "mmr", n: "Myanmar (Burma) (မြန်မာ)" },
		{ i: "na", z: "nam", n: "Namibia (Namibië)" },
		{ i: "nr", z: "nru", n: "Nauru" },
		{ i: "np", z: "npl", n: "Nepal (नेपाल)" },
		{ i: "nl", z: "nld", n: "Netherlands (Nederland)" },
		{ i: "nc", z: "ncl", n: "New Caledonia (Nouvelle-Calédonie)" },
		{ i: "nz", z: "nzl", n: "New Zealand" },
		{ i: "ni", z: "nic", n: "Nicaragua" },
		{ i: "ne", z: "ner", n: "Niger (Nijar)" },
		{ i: "ng", z: "nga", n: "Nigeria" },
		{ i: "nu", z: "niu", n: "Niue" },
		{ i: "nf", z: "nfk", n: "Norfolk Island" },
		{ i: "kp", z: "prk", n: "North Korea (조선 민주주의 인민 공화국)" },
		{ i: "mp", z: "mnp", n: "Northern Mariana Islands" },
		{ i: "no", z: "nor", n: "Norway (Norge)" },
		{ i: "om", z: "omn", n: "Oman (‫عُمان‬‎)" },
		{ i: "pk", z: "pak", n: "Pakistan (‫پاکستان‬‎)" },
		{ i: "pw", z: "plw", n: "Palau" },
		{ i: "ps", z: "pse", n: "Palestine (‫فلسطين‬‎)" },
		{ i: "pa", z: "pan", n: "Panama (Panamá)" },
		{ i: "pg", z: "png", n: "Papua New Guinea" },
		{ i: "py", z: "pry", n: "Paraguay" },
		{ i: "pe", z: "per", n: "Peru (Perú)" },
		{ i: "ph", z: "phl", n: "Philippines" },
		{ i: "pn", z: "pcn", n: "Pitcairn Islands" },
		{ i: "pl", z: "pol", n: "Poland (Polska)" },
		{ i: "pt", z: "prt", n: "Portugal" },
		{ i: "pr", z: "pri", n: "Puerto Rico" },
		{ i: "qa", z: "qat", n: "Qatar (‫قطر‬‎)" },
		{ i: "re", z: "reu", n: "Réunion (La Réunion)" },
		{ i: "ro", z: "rou", n: "Romania (România)" },
		{ i: "ru", z: "rus", n: "Russia (Россия)" },
		{ i: "rw", z: "rwa", n: "Rwanda" },
		{ i: "bl", z: "blm", n: "Saint Barthélemy (Saint-Barthélemy)" },
		{ i: "sh", z: "shn", n: "Saint Helena" },
		{ i: "kn", z: "kna", n: "Saint Kitts and Nevis" },
		{ i: "lc", z: "lca", n: "Saint Lucia" },
		{ i: "mf", z: "maf", n: "Saint Martin (Saint-Martin (partie française))" },
		{ i: "pm", z: "spm", n: "Saint Pierre and Miquelon (Saint-Pierre-et-Miquelon)" },
		{ i: "vc", z: "vct", n: "Saint Vincent and the Grenadines" },
		{ i: "ws", z: "wsm", n: "Samoa" },
		{ i: "sm", z: "smr", n: "San Marino" },
		{ i: "st", z: "stp", n: "São Tomé and Príncipe (São Tomé e Príncipe)" },
		{ i: "sa", z: "sau", n: "Saudi Arabia (‫المملكة العربية السعودية‬‎)" },
		{ i: "sn", z: "sen", n: "Senegal (Sénégal)" },
		{ i: "rs", z: "srb", n: "Serbia (Србија)" },
		{ i: "sc", z: "syc", n: "Seychelles" },
		{ i: "sl", z: "sle", n: "Sierra Leone" },
		{ i: "sg", z: "sgp", n: "Singapore" },
		{ i: "sx", z: "sxm", n: "Sint Maarten" },
		{ i: "sk", z: "svk", n: "Slovakia (Slovensko)" },
		{ i: "si", z: "svn", n: "Slovenia (Slovenija)" },
		{ i: "sb", z: "slb", n: "Solomon Islands" },
		{ i: "so", z: "som", n: "Somalia (Soomaaliya)" },
		{ i: "za", z: "zaf", n: "South Africa" },
		{ i: "gs", z: "sgs", n: "South Georgia & South Sandwich Islands" },
		{ i: "kr", z: "kor", n: "South Korea (대한민국)" },
		{ i: "ss", z: "ssd", n: "South Sudan (‫جنوب السودان‬‎)" },
		{ i: "es", z: "esp", n: "Spain (España)" },
		{ i: "lk", z: "lka", n: "Sri Lanka (ශ්‍රී ලංකාව)" },
		{ i: "sd", z: "sdn", n: "Sudan (‫السودان‬‎)" },
		{ i: "sr", z: "sur", n: "Suriname" },
		{ i: "sj", z: "sjm", n: "Svalbard and Jan Mayen (Svalbard og Jan Mayen)" },
		{ i: "sz", z: "swz", n: "Swaziland" },
		{ i: "se", z: "swe", n: "Sweden (Sverige)" },
		{ i: "ch", z: "che", n: "Switzerland (Schweiz)" },
		{ i: "sy", z: "syr", n: "Syria (‫سوريا‬‎)" },
		{ i: "tw", z: "twn", n: "Taiwan (台灣)" },
		{ i: "tj", z: "tjk", n: "Tajikistan" },
		{ i: "tz", z: "tza", n: "Tanzania" },
		{ i: "th", z: "tha", n: "Thailand (ไทย)" },
		{ i: "tl", z: "tls", n: "Timor-Leste" },
		{ i: "tg", z: "tgo", n: "Togo" },
		{ i: "tk", z: "tkl", n: "Tokelau" },
		{ i: "to", z: "ton", n: "Tonga" },
		{ i: "tt", z: "tto", n: "Trinidad and Tobago" },
		{ i: "tn", z: "tun", n: "Tunisia (‫تونس‬‎)" },
		{ i: "tr", z: "tur", n: "Turkey (Türkiye)" },
		{ i: "tm", z: "tkm", n: "Turkmenistan" },
		{ i: "tc", z: "tca", n: "Turks and Caicos Islands" },
		{ i: "tv", z: "tuv", n: "Tuvalu" },
		{ i: "ug", z: "uga", n: "Uganda" },
		{ i: "ua", z: "ukr", n: "Ukraine (Україна)" },
		{ i: "ae", z: "are", n: "United Arab Emirates (‫الإمارات العربية المتحدة‬‎)" },
		{ i: "gb", z: "gbr", n: "United Kingdom" },
		{ i: "us", z: "usa", n: "United States" },
		{ i: "um", z: "umi", n: "U.S. Minor Outlying Islands" },
		{ i: "vi", z: "vir", n: "U.S. Virgin Islands" },
		{ i: "uy", z: "ury", n: "Uruguay" },
		{ i: "uz", z: "uzb", n: "Uzbekistan (Oʻzbekiston)" },
		{ i: "vu", z: "vut", n: "Vanuatu" },
		{ i: "va", z: "vat", n: "Vatican City (Città del Vaticano)" },
		{ i: "ve", z: "ven", n: "Venezuela" },
		{ i: "vn", z: "vnm", n: "Vietnam (Việt Nam)" },
		{ i: "wf", z: "wlf", n: "Wallis and Futuna" },
		{ i: "eh", z: "esh", n: "Western Sahara (‫الصحراء الغربية‬‎)" },
		{ i: "ye", z: "yem", n: "Yemen (‫اليمن‬‎)" },
		{ i: "zm", z: "zmb", n: "Zambia" },
		{ i: "zw", z: "zwe", n: "Zimbabwe"}
	], function(i, c) {
		c.name = c.n;
		c.iso2 = c.i;
		c.iso3 = c.z;
		delete c.n;
		delete c.i;
		delete c.z;
	});
});