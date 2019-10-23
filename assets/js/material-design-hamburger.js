/*
The MIT License (MIT)

Copyright (c) 2015 Chris Wheatley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.materialDesignHamburger = factory();
  }
}(this, function() {
function materialDesignHamburger() {
  'use strict';

  document.querySelector('.material-design-hamburger__icon').addEventListener(
      'click',
      function() {
    var child = this.childNodes[1].classList;

    if (child.contains('material-design-hamburger__icon--to-arrow')) {
      child.remove('material-design-hamburger__icon--to-arrow');
      child.add('material-design-hamburger__icon--from-arrow');
    } else {
      child.remove('material-design-hamburger__icon--from-arrow');
      child.add('material-design-hamburger__icon--to-arrow');
    }

  });
}

return materialDesignHamburger;
}));

function toggle_hamburger() {
var child = document.querySelector('.material-design-hamburger__icon').childNodes[1].classList;

    if (child.contains('material-design-hamburger__icon--to-arrow')) {
      child.remove('material-design-hamburger__icon--to-arrow');
      child.add('material-design-hamburger__icon--from-arrow');
    } else {
      child.remove('material-design-hamburger__icon--from-arrow');
      child.add('material-design-hamburger__icon--to-arrow');
    }

}
