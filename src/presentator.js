(function(global){
    var presentator = {},
        $document = $(global.document),
        $presentator,
        presentationsListModeCSSClass = 'PresentationsList',
        presentationSlidesListModeCSClass = 'PresentationSlidesList',
        presentationSlideModeCSSClass = 'PresentationSlide',
        activeClass = 'Active',
        showedCSSClass = 'Showed';

    global.presentator = presentator;

    function Presentation(root, presentationId){
        var presentation = this,
            $presentation = $(root);

        presentation.$presentation = $presentation;
        presentation.id = presentationId;

        presentation.isListMode = false;

        presentation.activeSlide = null;

        var slides = [],
            slidesById = {};

        presentation.slides = slides;
        presentation.slidesById = slidesById;

        $presentation.find('.Slide').each(function(index, slide){
            var slideId = slide.id || index.toString();
            slidesById[slideId] = slides[index] = new Slide(slide, slideId, index, presentation);
        });


        presentation.slideProgressCoefficient = 100 / slides.length;
        presentation.progress = 0;
        presentation.$progressIndicator = $presentation.find('.ProgressIndicator');


        $presentation.click(presentation, presentationClick);

    }

    function presentationProgress(presentation){
        if (presentation.$progressIndicator[0]){
            if (presentation.activeSlide){
                presentation.$progressIndicator.css(
                    'width',
                    (presentation.activeSlide.index + 1)
                        * presentation.slideProgressCoefficient
                ) ;
            } else{
                presentation.progress = 0;
                presentation.$progressIndicator.css('width', 0);
            }
        }
    }

    Presentation.prototype = {
        //todo common list
        setActiveSlide: function(slide){
            var presentation = this,
                newActiveSlide;

            if (typeof slide === 'string'){
                newActiveSlide = presentation.slidesById[slide];
            } else{
                newActiveSlide = slide;
            }

            if (newActiveSlide){
                if ((newActiveSlide !== presentation.activeSlide)
                    && presentation.activeSlide !== null){
                    presentation.activeSlide.setActive(false);
                }

                presentation.activeSlide = newActiveSlide;
                newActiveSlide.setActive(true);
                presentationProgress(presentation);


            } else{
                presentator.log('error', 'unknown slide id', slide, presentation.id);
            }

            return presentation;
        },

        unselectActiveSlide: function(){
            var presentation = this;
            if (presentation.activeSlide !== null){
                presentation.activeSlide.setActive(false);
                presentation.activeSlide = null;
                presentationProgress(presentation);
            }
            return presentation;
        },

        nextSlide: function(){
            var presentation = this,
                currentActiveSlide = presentation.activeSlide;
            if (currentActiveSlide === null){
                presentation.setActiveSlide(presentation.slides[0]);
            } else if (currentActiveSlide.index < (presentation.slides.length - 1)){
                presentation.setActiveSlide(presentation.slides[currentActiveSlide.index + 1]);
            }
            return presentation;
        },

        previousSlide: function(){
            var presentation = this,
                currentActiveSlide = presentation.activeSlide;
            if (currentActiveSlide === null){
                presentation.setActiveSlide(presentation.slides[presentation.slides.length - 1]);
            } else if (currentActiveSlide.index !== 0){
                presentation.setActiveSlide(presentation.slides[currentActiveSlide.index - 1]);
            }
            return presentation;
        },

        'in': function(slideId){
            var presentation = this;
            presentation.isListMode = false;
            presentation.setActiveSlide(slideId);
            if (presentation.activeSlide){
                presentation.activeSlide.show();
            }

        },

        out: function(isUnselectActiveSlide){
            var presentation = this;
            presentation.isListMode = true;
            if (presentation.activeSlide){
                presentation.activeSlide.hide();
                if (isUnselectActiveSlide){
                    presentation.unselectActiveSlide();
                }
            }
        },

        setActive: function(isActive){
            var presentation = this;
            presentation.$presentation[isActive ? 'addClass' : 'removeClass'](activeClass);
            return presentation;
        }
    };

    function Slide(root, slideId, index, presentation){
        var slide = this,
            $slide = $(root);
        slide.$slide = $slide;
        slide.id = slideId;
        slide.index = index;
        slide.presentation = presentation;
        $slide.click(slide, slideClick);
    }

    Slide.prototype = {
        show: function(){
            var slide = this;
            slide.$slide.trigger('presentator:slideShow');
            $document.trigger('presentator:slideShow', slide.id);
            return slide;
        },
        hide: function(){
            var slide = this;
            slide.$slide.trigger('presentator:slideHide');
            $document.trigger('presentator:slideHide', slide.id);
            return slide;
        },
        setActive: function(isActive){
            var slide = this;
            if (isActive){
                slide.$slide.addClass(activeClass);
                if (!slide.presentation.isListMode){
                    slide.show();
                }
            } else{
                slide.$slide.removeClass(activeClass);
                if (!slide.presentation.isListMode){
                    slide.hide();
                }
            }
            return slide;
        }
    };

    function presentationClick(e){
        if (presentator.isListMode){
            //e.data — presentation
            presentator.showPresentation(e.data.id);
        }
    }

    function slideClick(e){
        if (presentator.activePresentation.isListMode){
            //e.data — slide
            presentator.showSlide(e.data.id);
        }
    }

    presentator.showSlide = function(slideId, presentationId){
        var showedPresentation;

        if (presentationId){
            showedPresentation = presentator.presentationsById[presentationId];
        } else{
            showedPresentation = presentator.activePresentation;
        }

        if (showedPresentation){
            changeActivePresentation(showedPresentation);
            showedPresentation.show(slideId);
        } else{
            presentator.log('error', 'unknown presentation id', presentationId);
        }

    };

    function changeActivePresentation(showedPresentation){
        if (showedPresentation !== presentator.activePresentation){
            if (presentator.activePresentation){
                presentator.activePresentation.hide();
            }
            presentator.activePresentation = showedPresentation;
        }
    }

    presentator.showPresentation = function(presentationId){
        var showedPresentation = presentator.presentationsById[presentationId];
        if (showedPresentation){
            changeActivePresentation(showedPresentation);
        } else{
            presentator.log('error', 'unknown presentation id', presentationId);
        }
    };



    presentator.log = function(messageType, mssage, data){
        if (presentator.mode === 'debug'){
            console.log.apply(console, arguments);
        }
    };


    presentator.settings = {
        mode: 'debug',
        keys: {
            next: [39, 68],
            previous: [37, 65],
            previousLevel: [40, 83],
            nextLevel: [38, 87],
            'in': [13, 32],
            out: [27]
            //,
            //blockedKeys: [82, 116]
        }
    };

    function transformSettingsKeys(keys){
        var keyCodesMap = {};
        $.each(keys, function(eventName, keyCodes){
            $.each(keyCodes, function(index, keyCode){
                if (!keyCodesMap.hasOwnProperty(keyCode)){
                    keyCodesMap[keyCode] = 'presentator:' + eventName;
                }
            })
        });
        return keyCodesMap;
    }


    presentator.next = function(){

    };

    presentator.previous = function(){

    };

    presentator.nextLevel = function(){

    };

    presentator.previousLevel = function(){

    };

    presentator.presentations = [];
    presentator.presentationsById = {};
    presentator.activePresentation = null;
    presentator.isListMode = true;
    presentator.$presentator = null;


    presentator.init = function($presentator){

        var presentations = presentator.presentations,
            presentationsById = presentator.presentationsById;

        presentator.$presentator = $presentator = $presentator || $(global.document.body);

        $presentator.find('.Presentation').each(function(index, item){
            var presentationId = item.id || index.toSource();
            presentationsById[presentationId]
                = presentations[index]
                    = new Presentation(item, presentationId);
        });

        var keyCodeToEvents = transformSettingsKeys(presentator.settings.keys);

        $document.keydown(function(e){
                if (keyCodeToEvents.hasOwnProperty(e.keyCode.toString())){
                    $document.trigger(keyCodeToEvents[e.keyCode], e);
                }
            })
            .on('presentator:next', function(){
                presentator.next();
            })
            .on('presentator:previous', function(){
                presentator.previous();
            })
            .on('presentator:nextLevel', function(){
                presentator.nextLevel();
            })
            .on('presentator:previousLevel', function(){
                presentator.previousLevel();
            })
            .on('presentator:in', function(){
                presentator['in']();
            })
            .on('presentator:out', function(){
                presentator.out();
            })
            //todo move
            .on('blockedKeys', function(e, keydownEvent){
                keydownEvent.preventDefault();
            });


    };

}(this));
