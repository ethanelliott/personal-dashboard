var express = require('express');
var fs = require("fs");
var request = require('request-ssl');
var cheerio = require('cheerio');
var ical2json = require("ical2json");
var dt = require('datetimejs');

var router = express.Router();

router.get('/scrape', function(req, res, next){
  var username = "100622168";
  var password = "L8E5T9";
  var payload = {
    'user': username,
    'pass': password,
    'uuid': '0xACA021'
  };
  var j = request.jar();
  request.addFingerprint('ssbp.mycampus.ca', 'D9:14:01:63:8B:D7:FB:EC:AD:65:0B:E1:2C:36:B3:11:8A:70:64:04');
  request.addFingerprint('portal.mycampus.ca', 'BA:AD:35:38:1E:8C:87:F3:BD:05:16:B7:E0:63:BA:EA:66:06:2D:16');
  var selectTermURL = "https://ssbp.mycampus.ca/prod_uoit/bwcklibs.P_StoreTerm";
  var pageURL = "http://portal.mycampus.ca/cp/ip/login?sys=sct&url=https://ssbp.mycampus.ca/prod_uoit/twbkwbis.P_GenMenu?name=bmenu.P_RegMnu2";
  var requestURL = "http://portal.mycampus.ca/cp/ip/login?sys=sct&url=https://ssbp.mycampus.ca/prod_uoit/bwskfshd.P_CrseSchdDetl";
  var detailURL = "https://ssbp.mycampus.ca/prod_uoit/bwskfshd.P_CrseSchdDetl";
  request.post({url:'https://portal.mycampus.ca/cp/home/login', form: payload, jar:j}, function(er,rs,bd) {
    console.log(rs.statusCode);
    var termData = {'term_in': "201701", "name_var":"bmenu.P_RegMnu2"};
    request.post({url:pageURL, jar:j}, function(err,rsp,bdy) {
      console.log(rsp.statusCode);
      request.post({url:selectTermURL, form:termData, jar:j}, function(erro,resp,body) {
        console.log(erro);
        //res.json({"jar":j, "error":erro, "response": resp, "data": body});
      });
    });
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  var schArray = [];
  var url = "https://calendar.google.com/calendar/ical/gdmkcomaf0lunq1hqgc6c5urec%40group.calendar.google.com/private-f554f24e635c1c8add5f1625d7a4c42f/basic.ics";
  request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var icalJSON = ical2json.convert(body);
         var sch = icalJSON;
         for (i = 0; i < sch.VEVENT.length; i++)
         {
           var today = new Date();
           if (sch.VEVENT[i].DTSTART && parseicaldate(sch.VEVENT[i].DTSTART).getFullYear() === today.getFullYear())
           {
             var startD = parseicaldate(sch.VEVENT[i].DTSTART);
             var endD = parseicaldate(sch.VEVENT[i].DTEND);
             var name = sch.VEVENT[i].SUMMARY;
             var info = sch.VEVENT[i].DESCRIPTION;
             var room = sch.VEVENT[i].LOCATION;
             var type = "";
             if (name.search("Lecture") >= 0)
             {
               name = name.substr(0, name.search("Lecture")-1);
               type = "Lecture";
             }
             else if (name.search("Laboratory") >= 0)
             {
               name = name.substr(0, name.search("Laboratory")-1);
               type = "Laboratory";
             }
             else if (name.search("Tutorial"))
             {
               name = name.substr(0, name.search("Tutorial")-1);
               type = "Tutorial";
             }
             else
             {
               type = "";
             }
             var crn = info.substr((info.search("CRN")+5),5);
             var courseCode = info.substr((info.search("Course Code")+13),(info.search("nSection") - (info.search("Course Code")+15)));
             var section = info.substr((info.search("Section")+9),3);
             var obj = {
               "start_date_object":startD,
               "end_date_object":endD,
               "date_string":startD.toLocaleDateString(),
               "start_time_string":startD.toLocaleTimeString(),
               "end_time_string":endD.toLocaleTimeString(),
               "name":name,
               "location":room,
               "type":type,
               "crn":crn,
               "code":courseCode,
               "section":section
             };
             schArray.push(obj);
           }
         }
         var nevent;
         var neventsep = -1;
         var cevent;
         var ceventsep = 1;
         sortDates(schArray);
         var arrayString = JSON.stringify(schArray);
         var eventsToday = [];
         for(i = 0; i < schArray.length; i++)
         {
           var d = new Date(schArray[i].start_date_object);
           var ed = new Date(schArray[i].end_date_object);
           var td = new Date();
           if (d.getDate() === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear())
           {
             eventsToday.push(schArray[i]);
             var diff = d.getTime() - td.getTime();
             if (diff > 0)
             {
               if (neventsep === -1)
               {
                 neventsep = diff;
                 nevent = schArray[i];
               }
               else if (diff < neventsep)
               {
                 neventsep = diff;
                 nevent = schArray[i];
               }
             }
             else if (diff < 0)
             {
               var stDiff = ed.getTime() - td.getTime();
               if (stDiff > 0)
               {
                 console.log(stDiff);
                 if (ceventsep === 1)
                 {
                   ceventsep = diff;
                   cevent = schArray[i];
                 }
                 else if (diff > cevent)
                 {
                   ceventsep = diff;
                   cevent = schArray[i];
                 }
               }
             }
           }
         }
         res.render('index', { title: "Dashboard", events: eventsToday, nextEvent:nevent, currentEvent: cevent});
      }
  });
});

function parseicaldate(icalStr)
{
  var strYear = icalStr.substr(0,4);
  var strMonth = icalStr.substr(4,2);
  var strDay = icalStr.substr(6,2);
  var strHour = icalStr.substr(9,2);
  var strMin = icalStr.substr(11,2);
  var strSec = icalStr.substr(13,2);
  var sdate = strYear + "/" + strMonth + "/" + strDay + " " + strHour + ":" + strMin + ":" + strSec + " UTC";
  var oDate =  new Date(sdate);
  return oDate;
}

function sortDates(arr)
{
  var n = arr.length;
  for (i = 1; i < n; i++)
  {
    for (j = 0; j < (n-i); j++)
    {
      var d1 = new Date(arr[j].start_date_object);
      var d2 = new Date(arr[j+1].start_date_object);
      if (d1.getTime() > d2.getTime())
      {
        var tempArray = arr[j];
        arr[j] = arr[j+1];
        arr[j+1] = tempArray;
      }
    }
  }
}

module.exports = router;
