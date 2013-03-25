var editid;

function editrcpt(newid) {
    editid = newid;
    $("#receiptimg").attr("src","data/" + editid + ".jpg");
    $.ajax({
        url: "api/" + editid,
        success: function(data) {
            $("#receiptdata :input").each(function() {
                $(this).val("");
            });
            $("#receiptdata").show();
            for (k in data) {
                $("[name="+k+"]").val(data[k]);
            }
            $("select").selectmenu("refresh");
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
        if (myid == activebtn)
            return;
        activebtn = myid;
        $("#editreceipts").toggle();
        $("#newreceipts").toggle();
    });

    $("#upload").click(function() {
        if ($("#image").val() != '') {
            var fd = new FormData();
            fd.append("image",$(":file")[0].files[0]);
            fd.append("test","hi");
            $.ajax({
                url: "api",
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,
                success: function(data) {
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
        $("#receiptdata :input").each(function() {
            if ($(this).val() && $(this).attr("name"))
                data[$(this).attr("name")] = $(this).val();
        });
        $.ajax({
            url: "api/" + editid,
            type: "POST",
            data: data,
            success: function(data) {
            },
            error: function(data) {
                alert("Error updating");
            }
        });
    });

    $.ajax({
      url: "api",
      success: function(data) {
          for (var d in data) {
              d = data[d];
              var newhtml = '<li data-theme="c">';
              newhtml += '<a id="'+d.id+'"href="#" data-transition="slide">';
              newhtml += '<img src="data/'+d.id+'.jpg">';
              newhtml += (d.name || "Unnamed")+'</a>';
              newhtml += '</li>';
              $("#receiptslist").append(newhtml);
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
});
