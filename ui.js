var editid;

function refreshreceipts() {
    $.ajax({
      url: "api",
      data: { "state": "open" },
      success: function(data) {
          $(".receiptlink").each(function() {
              $(this).remove();
          });
          for (var d in data) {
              d = data[d];
              var newhtml = '<li data-theme="c" class="receiptlink">';
              newhtml += '<a id="'+d.id+'"href="#" data-transition="slide">';
              newhtml += (d.name || "Unnamed")+'</a>';
              newhtml += '</li>';
              if (d.reimburse && JSON.parse(d.reimburse) && (!d.expensefiled || !JSON.parse(d.reimburse))) {
                  var newrcpt = $(newhtml).insertAfter("#expensereport");
                  $(newrcpt).children("a").addClass("expensercpt");
              } else {
                  $(newhtml).insertAfter("#openreceipt")
              }
          }
          $("#receiptslist").listview('refresh');
          $("#receiptslist a").click(function (e) {
              e.preventDefault();
              editrcpt($(this).attr("id"));
          });
      },
      error: function() {
          alert("Error loading receipts");
      }
    });
}

function editrcpt(newid) {
    editid = newid;
    $.mobile.loading("show");
    $("#receiptimg").attr("src","data/" + editid + ".jpg");
    $("#receiptslist").hide();
    $.ajax({
        url: "api/" + editid,
        success: function(data) {
            $("#update").button("disable");
            $("#receiptdata :input").each(function() {
                $(this).val("");
            });
            $("#receiptdata").show();
            $("#receiptslist").hide();
            for (k in data) {
                $("[name="+k+"]").val(data[k]);
            }
            $("select").selectmenu("refresh");
            $("#receiptdata :input").change(function() {
                $("#update").button("enable");
            });
            if (data["reimburse"] == "true")
                $("#reimburse").attr("checked", true).checkboxradio("refresh");
            else
                $("#reimburse").attr("checked", false).checkboxradio("refresh");
            if ($('#ocrdiv').css('display') != 'none') {
                var i = new Image();
                i.src = $("#receiptimg").attr("src");
                $("#receiptdiv").css("width",i.width+"px");
                $("#receiptdiv").css("height",i.height+"px");
                $("#receiptdiv").css("overflow",'hidden');
                $("#receiptdiv").height($("#receiptimg").height());
                $("#cropbox").css("top","0px");
                $("#cropbox").css("left","0px");
                $("#cropbox").width($("#receiptimg").width()-6);
                $("#cropbox").height($("#receiptimg").height()-6);
                if (data.crop_top) {
                    $("#cropbox").css("top",data.crop_top+"px");
                    $("#cropbox").css("left",data.crop_left+"px");
                    $("#cropbox").width(data.crop_width);
                    $("#cropbox").height(data.crop_height);
                }
                $("#cropbox").show();
            }
            $.mobile.loading("hide");
        }
    });
}

var activebtn;

$(document).ready(function() {
    $("#editreceipts").hide();
    $("#receiptdata").hide();
    $("#date").datepicker({
        dateFormat: "yy-mm-dd"
    });

    $("#upload").button("disable");
    $("#image").change(function() {
        if ($("#image").val())
            $("#upload").button("enable");
        else
            $("#upload").button("disable");
    });

    activebtn = $(".ui-navbar .ui-btn-active").attr("id");
    $(".actiontoggle").click(function() {
        var myid = $(this).attr("id");
        $("#receiptslist").show();
        $("#receiptdata").hide();
        if (myid == activebtn)
            return;
        activebtn = myid;
        $("#editreceipts").toggle();
        $("#newreceipts").toggle();
    });

    $("#upload").click(function() {
        if ($("#image").val() != '') {
            $.mobile.loading("show");
            var fd = new FormData();
            fd.append("image",$(":file")[0].files[0]);
            $.ajax({
                url: "api",
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,
                success: function(data) {
                    $.mobile.loading("hide");
                    $("#goedit").click();
                    editrcpt(data);
                },
                error: function() {
                }
            });
        }
    });

    $("#update").click(function () {
        var data = {}
        $.mobile.loading("show");
        $("#receiptdata :input").each(function() {
            if ($(this).val() && $(this).attr("name"))
                data[$(this).attr("name")] = $(this).val();
        });
        if ($("#reimburse").is(":checked"))
            data["reimburse"] = true;
        else
            data["reimburse"] = false;
        if ($('#ocrdiv').css('display') != 'none') {
            data["crop_top"] = parseInt($("#cropbox").css("top"));
            data["crop_left"] = parseInt($("#cropbox").css("left"));
            data["crop_height"] = $("#cropbox").height();
            data["crop_width"] = $("#cropbox").width();
        }
        $.ajax({
            url: "api/" + editid,
            type: "POST",
            data: data,
            success: function(data) {
                refreshreceipts();
                $("#receiptdata").hide();
                $("#receiptslist").show();
                $.mobile.loading("hide");
            },
            error: function(data) {
                alert("Error updating");
            }
        });
    });

    $("#cropbox").resizable({
        containment: "parent",
        handles: "n, e, s, w, ne, se, sw, nw",
        autoHide: true,
        resize: function() {
            $("#update").button("enable");
        }
    });
    $("#cropbox").hide();

    $("#doocr").click(function () {
        $.mobile.loading("show");
        $.ajax({
            url: "api/" + editid + "/ocr",
            success: function(data) {
                $("#cropbox").css("left",data["bounds"]["l"]+"px");
                $("#cropbox").css("top",data["bounds"]["t"]+"px");
                $("#cropbox").width(data["bounds"]["r"]-data["bounds"]["l"]);
                $("#cropbox").height(data["bounds"]["b"]-data["bounds"]["t"]);
                $("#update").button("enable");
                if (data.title && !$("#name").val())
                    $("#name").val(data.title);
                if (data.date && !$("#date").val())
                    $("#date").val(data.date);
                if (data.total && !$("#amount").val())
                    $("#amount").val(parseInt(data.total)/100);
                $.mobile.loading("hide");
            }
        });
    });

    $("#expensegen").click(function () {
        document.location = "expensereport.html";
    });

    $("#expensefiled").click(function (event) {
        event.stopPropagation();
        event.preventDefault();
        $.mobile.loading("show");
        var inexpenses = false;
        $(".expensercpt").each(function () {
            $.ajax({
                url: "api/" + $(this).attr("id"),
                type: "POST",
                async: false,
                data: {expensefiled: true},
                success: function(data) {
                },
                error: function(data) {
                    alert("Error updating");
                }
            });
        });
        $.mobile.loading("hide");
        refreshreceipts();
    });

    refreshreceipts();
});
