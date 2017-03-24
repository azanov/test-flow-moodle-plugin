jsPlumb.ready(function () {

    var canvas = document.getElementById("questionCanvas");
    var questions = jsPlumb.getSelector(".js-question-canvas .activity");
    var connections = {};
    var selectedConnection = null;

    // setup some defaults for jsPlumb.
    var instance = jsPlumb.getInstance({
        Endpoint: [
            "Dot", {
                radius: 2
            }],
        Connector: "StateMachine",
        HoverPaintStyle: {stroke: "#d30c0c", strokeWidth: 2 },
        ConnectionOverlays: [
            [ "Arrow", {
                location: 1,
                id: "arrow",
                length: 14,
                // foldback: 0.8
            } ],
            [ "Label", { label: "Alle", id: "label", cssClass: "aLabel" }]
        ],
        Container: "questionCanvas"
    });

    instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

    window.jsp = instance;

    function getEdgeLabel(edge) {
        var label = 'Alle';

        switch(edge.operator) {
            case 'eq':
                label = edge.lowerbound;
                break;
            case 'min':
                label = '>= ' + edge.lowerbound;
                break;
            case 'max':
                label = '<= ' + edge.upperbound;
                break;
            case 'less':
                label = '< ' + edge.upperbound;
                break;
            case 'more':
                label = '> ' + edge.lowerbound;
                break;
            case 'le':
                label = edge.lowerbound + ' < x < ' + edge.upperbound;
                break;
            case 'lq':
                label = edge.lowerbound + ' <= x <= ' + edge.upperbound;
                break;
        }
        return (''+label).replace(/0+$/, '0');
    }

    function showEdge(c) {
        var data = c.getData(),
            $pnl = $('.js-edge-panel');
        if (selectedConnection && selectedConnection.id == data.edgeId) {
            selectedConnection = null;
            $pnl.hide();
        } else {
            selectedConnection = connections[data.edgeId];
            $pnl
                .find('.js-edge-id').val(selectedConnection.id)
                .end()
                .find('.js-upperbound').val(selectedConnection.upperbound || '')
                .end()
                .find('.js-lowerbound').val(selectedConnection.lowerbound || '')
                .end()
                .find('.js-operator').val(selectedConnection.operator || '').change()
                .end()
                .show();
            $('.js-question-panel').hide();
            $('.js-branchedquiz-question').removeClass('selected');
            selectedQuestion = null;
        }
    }

    instance.bind("click", showEdge);


    //
    // initialise element as connection targets and source.
    //
    var initNode = function(el) {

        // initialise draggable elements.
        instance.draggable(el, {
            grid:[50,50],
            stop: function(e){
                var $el = $(e.el),
                    id = $el.data('slot-id'),
                    quizId = $el.closest('.section.main').data('quiz-id'),
                    x = e.finalPos[0],
                    y = e.finalPos[1];

                $.ajax({
                    url: '/mod/branchedquiz/edit_rest.php?class=resource&field=posnode&quizid=' +
                        quizId + '&id=' + id + '&sesskey=' + M.cfg.sesskey + '&x=' + x + '&y=' + y,
                    type: 'POST',
                    success: function(result) {
                        console.log(result);
                        if (result.error) {
                            alert(result.error);
                        } else {
                            // var c = instance.connect({ source: params.connection.sourceId, target: params.connection.targetId, type:"basic", test: 1 });
                            // connections[]
                        }
                    },
                    error: function() {
                        alert('Verbindung nicht möglich');
                    }
                });
            }
        });

        instance.makeSource(el, {
            filter: ".ep",
            anchor: "Continuous",
            connectorStyle: { stroke: "#0072b8", strokeWidth: 2, outlineStroke: "transparent", outlineWidth: 4 },
            connectionType:"basic",
            extract:{
                "action":"the-action"
            },
            // maxConnections: 2,
            // onMaxConnections: function (info, e) {
            //     alert("Maximum connections (" + info.maxConnections + ") reached");
            // }

        });

        instance.makeTarget(el, {
            dropOptions: { hoverClass: "dragHover" },
            anchor: "Continuous",
            allowLoopback: false,
            beforeDrop: function (params) {
                var $source = $(params.connection.source),
                    $target = $(params.connection.target),
                    quizId = $source.closest('.section.main').data('quiz-id'),
                    startSlot = $source.data('slot-id')
                    endSlot = $target.data('slot-id');

                $.ajax({
                    url: '/mod/branchedquiz/edit_rest.php?class=resource&field=addedge&quizid=' +
                        quizId + '&startSlot=' + startSlot + '&sesskey=' + M.cfg.sesskey + '&endSlot=' + endSlot,
                    type: 'POST',
                    success: function(result) {
                        console.log(result);
                        if (result.error) {
                            alert(result.error);
                        } else {
                            var c = instance.connect({
                                source: params.connection.sourceId, target: params.connection.targetId, type:"basic", test: 1 });
                            c.setData({
                                edgeId: result.id
                            })
                            connections[result.id] = {
                                id: result.id,
                                operator: '',
                                lowerbound: null,
                                upperbound: null,
                                next: endSlot,
                                slotid: startSlot,
                                instance: c
                            };
                            showEdge(c);

                        }
                    },
                    error: function() {
                        alert('Verbindung nicht möglich');
                    }
                });

                return false;
                // return confirm("Connect " + params.sourceId + " to " + params.targetId + "?");
            },
        });

        // this is not part of the core demo functionality; it is a means for the Toolkit edition's wrapped
        // version of this demo to find out about new nodes being added.
        //
        instance.fire("jsPlumbDemoNodeAdded", el);
    };

    // suspend drawing and initialise.
    instance.batch(function () {

        var slots = {};

        for (var i = 0; i < questions.length; i++) {
            var slot = Number(questions[i].dataset.slot);
            slots[questions[i].dataset.slot] = questions[i].id;

            questions[i].style.left = (questions[i].dataset.x ? questions[i].dataset.x : 30) + 'px';
            questions[i].style.top = (questions[i].dataset.y ? questions[i].dataset.y : (30 * slot + 50 * (slot - 1))) + 'px';

            initNode(questions[i], true);


        }

        if (branchedquiz_edges) {
            for (var k in branchedquiz_edges) {
                if (branchedquiz_edges.hasOwnProperty(k)) {
                   connections[branchedquiz_edges[k].id] = branchedquiz_edges[k];
                   var c = instance.connect({
                        source: 'slot-' + branchedquiz_edges[k].slotid, target: 'slot-' + branchedquiz_edges[k].next, type:"basic" },
                        {
                            edgeId: branchedquiz_edges[k].id
                        }
                    );
                   c.setData({
                        edgeId: branchedquiz_edges[k].id
                   });
                   c.getOverlay('label').setLabel(getEdgeLabel(connections[branchedquiz_edges[k].id]));
                   connections[branchedquiz_edges[k].id].instance = c;
                   console.log(c);
                }
            }
        }

        // for (var i = 0; i < questions.length; i++) {
        //     var slot = Number(questions[i].dataset.slot) + 1;
        //     if (slots[slot])
        //         instance.connect({ source: questions[i].id, target: slots[slot], type:"basic" });
        // }


    });

    // instance.bind("connection", function (info) {
    //     var c = {
    //         slotid: info.source.dataset.slotId,
    //         next: info.target.dataset.slotId,
    //         feedbacktext: "",
    //         lowerbound: null,
    //         operator: "",
    //         upperbound: ""
    //     };
    //     connections[info.getData().edgeId] = c;
    //     console.log(connections);
    //     info.connection.getOverlay("label").setLabel(getEdgeLabel());
    // });

    jsPlumb.fire("jsPlumbDemoLoaded", instance);

    var selectedQuestion = null;

    $('#questionCanvas').on('dblclick', '.js-branchedquiz-question', function() {
        $self = $(this);
        $pnl = $('.js-question-panel');

        $('.js-edge-panel').hide();
        selectedConnection = null;

        $self
            .toggleClass('selected')
            .siblings()
            .removeClass('selected');

        selectedQuestion = {
            slotId: $self.data('slot-id'),
            text: $self.data('text'),
            title: $self.data('title'),
            sectionId: $self.closest('.section').data('id'),
            slot: $self.data('slot')
        }

        console.log(selectedQuestion)

        if ($self.hasClass('selected')) {
            $pnl
                .find('h4')
                .text(selectedQuestion.title)
                .end()
                .find('.js-set-first-question')
                .toggleClass('hidden', selectedQuestion.slot == 1)
                .end()
                .find('.js-question-panel-text')
                .html(selectedQuestion.text)
                .find('p').each(function(index, item) {
                    if($.trim($(item).text()) === "") {
                        $(item).remove();
                    }
                });

            $pnl.show();
            MathJax.Hub.Queue(["Typeset",MathJax.Hub,$pnl.find('.question-panel-text')[0]]);
        } else {
            $pnl.hide();
        }

    });

    // console.log(M.cfg.sesskey)


    $('.js-set-first-question').on('click', function() {

        var $self = $(this),
            quizId = $(this).data('quizid'),
            $currentItem = $('#slot-' + selectedQuestion.slotId);

        $self.attr('disabled', true);
        $.ajax({
            url: '/mod/branchedquiz/edit_rest.php?page=1&class=resource&field=move&quizid=' +
                quizId + '&id=' + selectedQuestion.slotId + '&sesskey=' + M.cfg.sesskey + '&sectionId=' + selectedQuestion.sectionId,
            type: 'POST',
            success: function(result) {
                console.log(result);
                if (result.error) {
                    alert(result.error);
                } else {
                    $currentItem.attr('data-slot', 1).siblings().attr('data-slot', '-1')
                }
                $self.attr('disabled', null);
            },
            error: function() {
                alert('Löschen nicht möglich');
                $self.attr('disabled', null)
            }
        });

    });

    $('.js-remove-question').on('click', function() {
        var $self = $(this),
            quizId = $self.data('quizid'),
            sessKey = $self.data('sesskey');

        $self.attr('disabled', true);
        if(confirm('Sind Sie sicher, dass Sie die Frage löschen möchten?')) {
            $.ajax({
                url: '/mod/branchedquiz/edit_rest.php?class=resource&quizid=' + quizId + '&id=' +
                    selectedQuestion.slotId + '&sesskey=' + M.cfg.sesskey,
                type: 'DELETE',
                success: function(result) {
                    console.log(result);
                    if (result.error) {
                        alert(result.error);
                    } else {
                        instance.remove('slot-' + selectedQuestion.slotId);
                        // $('#slot-' + selectedQuestion.slotId).remove();
                        selectedQuestion = null;
                        $('.js-question-panel').hide();
                    }
                    $self.attr('disabled', null);
                },
                error: function() {
                    alert('Löschen nicht möglich');
                    $self.attr('disabled', null)
                }
            });

        }
    });

    $('.js-remove-edge').on('click', function() {
        var $self = $(this),
            quizId = $self.data('quizid'),
            sessKey = $self.data('sesskey');

        $self.attr('disabled', true);
        if(confirm('Sind Sie sicher, dass Sie die Verbindung löschen möchten?')) {
            $.ajax({
                url: '/mod/branchedquiz/edit_rest.php?class=edge&quizid=' + quizId + '&id=' +
                    selectedConnection.id + '&sesskey=' + M.cfg.sesskey,
                type: 'DELETE',
                success: function(result) {
                    console.log(result);
                    if (result.error) {
                        alert(result.error);
                    } else {
                        $('.js-edge-panel').hide();
                        instance.detach(selectedConnection.instance);
                    }
                    $self.attr('disabled', null);
                },
                error: function() {
                    alert('Löschen nicht möglich');
                    $self.attr('disabled', null)
                }
            });

        }
    });

    $('.js-operator').on('change', function() {
        switch($(this).val()) {
            case '':
                $('.js-lowerbound').hide();
                $('.js-upperbound').hide();
                break;
            case 'eq':
            case 'min':
            case 'more':
                $('.js-lowerbound').show();
                $('.js-upperbound').hide();
                break;
            case 'max':
            case 'less':
                $('.js-lowerbound').hide();
                $('.js-upperbound').show();
                break;
            case 'le':
            case 'lq':
                $('.js-lowerbound').show();
                $('.js-upperbound').show();
                break;
        }
    }).change();

    $('.js-edge-form').on('submit', function(e) {
        e.preventDefault();
        var $self = $(this);
        var data = $self.serialize();
        $self.attr('disabled', true)
            .find('input, select, button').attr('disabled', true);

        $.ajax({
            url: '/mod/branchedquiz/edit_rest.php?' + data,
            type: 'POST',
            success: function(result) {
                console.log(result);
                if (result.error) {
                    alert(result.error);
                } else {
                    selectedConnection.operator = result.operator;
                    selectedConnection.lowerbound = result.lowerbound;
                    selectedConnection.upperbound = result.upperbound;
                    selectedConnection.instance.getOverlay('label').setLabel(getEdgeLabel(selectedConnection));
                    selectedConnection = null;
                    $('.js-edge-panel').hide();
                }
                $self.attr('disabled', null).find('input, select, button').attr('disabled', null);
            },
            error: function() {
                alert('Speichern nicht möglich');
                $self.attr('disabled', null).find('input, select, button').attr('disabled', null);
            }
        });
        return false;
    });

});