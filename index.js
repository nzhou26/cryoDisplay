#!/usr/local/lib/nodejs/node-v12.19.0-linux-x64/bin/nodemon nodemon
var express = require('express');
var bodyParser =require('body-parser');
var multer = require('multer');
//var upload = multer();
var app = express();
var mysql = require('mysql');
var sql_config = require('./sql_config');
const path = require('path');
const { read } = require('fs');
var querystring = require('querystring');

app.set('view engine', 'pug');
app.set('views', './views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(upload.array()); 
app.use(express.static('public'));

app.use('../uploads', express.static(path.join(__dirname, '../uploads')));

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, '../uploads');
    },
    filename: function(req, file, cb) {
        //console.log(file);
        cb(null, file.fieldname + "-" + Date.now() + ".jpg");
    }
});


var upload = multer({ 
    storage: storage, 
    fileFilter: function(req, file, cb){
        var filetypes = /jpeg|jpg|png/; 
        var mimetype = filetypes.test(file.mimetype); 

        var extname = filetypes.test(path.extname(
                    file.originalname).toLowerCase());
                    
        if (mimetype && extname){
            return cb(null, true);
        }
        cb("Error: File upload only supports the "
                + "following filetypes - " + filetypes); 
    }
}).single("mypic");

app.get('/', function(req, res){
    var now = new Date();
    res.render('home_page',{
        url_project:"/project",
        url_data_para:"/data_para"
    });
    //console.log(process.argv);
    console.log('-----------------------------------------------------------------');
    console.log(now.toLocaleString() + ": checking homepage");
    console.log('-----------------------------------------------------------------\n');
});

app.get('/project', function(req, res){
    var now = new Date();
    var projectsList = [];

    var pool = mysql.createPool(sql_config);
    var sql = 'SELECT * FROM projectsTable';

    pool.query(sql,function (err, rows, fields) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
        } else{
            for (var i = 0; i < rows.length; i++) {
                var project ={
                    'id':rows[i].id,
                    'name':rows[i].name,
                    'owner':rows[i].owner,
                    'numberOfStructures':rows[i].numberOfStructures
                }

                projectsList.push(project);
            }
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": checking projects");        
            console.log('-----------------------------------------------------------------\n');
            res.render('project',{"projectsList":projectsList});

        }        
           
    })
    //pool.end();
});

app.get('/project/:id', function(req,res){
    var now = new Date();
    var pool = mysql.createPool(sql_config);

    pool.query('SELECT * FROM projectsTable WHERE id = ' + req.params.id, function(err, rows, fields){
        var project;

        if (err){
            res.status(50).json({"status_code": 500, "status_message": "internal server error"});
        } else{

            if(rows.length==1){
                var project = {
                    'id':rows[0].id,
                    'name':rows[0].name,
                    'owner':rows[0].owner,
                    'numberOfStructures':rows[0].numberOfStructures
                }
                console.log('-----------------------------------------------------------------');
                console.log(now.toLocaleString() + ": checking project: " + project.name);
                console.log('-----------------------------------------------------------------\n');
                res.render('details', {"project": project});
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });

    //pool.end();
});

app.get('/data_para', function(req,res){
    var now = new Date();
    var data_para_list = [];
    var pool = mysql.createPool(sql_config);
    
    var sql_read = 'SELECT * FROM data_collection_para';
    pool.query(sql_read, function(err, rows, fields){
        if (err){
            console.log('[SELECT ERROR] - ', err.message);
        }else{
            for (var i = 0; i < rows.length; i++) {
                var data_para ={
                    'date':rows[i].date,
                    'name':rows[i].name,
                    'collected_by':rows[i].collected_by
                }
                data_para_list.push(data_para);
            }
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": checking data parameters");
            console.log('-----------------------------------------------------------------\n');
            res.render('data_para',{"data_para_list":data_para_list}); 
        }
        
    });
    //pool.end();
});

app.get('/data_para/:date', function(req,res){
    var now = new Date();
    var pool = mysql.createPool(sql_config);

    pool.query("SELECT * FROM data_collection_para WHERE date = '" + req.params.date + "'", function(err, rows, fields){
        var data;

        if (err){
            res.status(50).json({"status_code": 500, "status_message": "internal server error"});
        } else{

            if(rows.length==1){
                var data = {
                    'date':rows[0].date,
                    'name':rows[0].name,
                    'collected_by':rows[0].collected_by,
                    'voltage':rows[0].voltage,
                    'magnification':rows[0].magnification,
                    'exposure_time':rows[0].exposure_time,
                    'number_of_frames':rows[0].number_of_frames,
                    'pixel_size':rows[0].pixel_size,
                    'dose_rate':rows[0].dose_rate,
                    'C2_lens':rows[0].C2_lens,
                    'objective_lens':rows[0].objective_lens,
                    'C2_aperture':rows[0].C2_aperture,
                    'spot_size':rows[0].spot_size,
                    'defocus_range':rows[0].defocus_range,
                    'delay_after_stage_shift':rows[0].delay_after_stage_shift
                }
                console.log('-----------------------------------------------------------------');
                console.log(now.toLocaleString() + ": checking data parameters: " + data.date);
                console.log('-----------------------------------------------------------------\n');
                res.render('data_details', {
                    "data": data,
                    //"confirm":confirm
                });
                //console.log(url_edit)
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });

    //pool.end();
});

app.get('/add_data', function(req, res){
    var now = new Date();
    console.log('-----------------------------------------------------------------');
    console.log(now.toLocaleString() + ": adding data");
    console.log('-----------------------------------------------------------------\n');
                
    res.render('add_data');
});

app.post('/add_data', function(req,res) {
    var now = new Date();

    var pool = mysql.createPool(sql_config);
    var sql = "INSERT INTO data_collection_para (date, name, collected_by,\
        voltage, magnification, exposure_time, number_of_frames, pixel_size, dose_rate,\
        C2_lens,objective_lens,C2_aperture,spot_size, defocus_range, delay_after_stage_shift) VALUES ?";
    var values = [
        [req.body.date, 
        req.body.name,
        req.body.collected_by,
        req.body.voltage,
        req.body.magnification,
        req.body.exposure_time,
        req.body.number_of_frames,
        req.body.pixel_size,
        req.body.dose_rate,
        req.body.C2_lens,
        req.body.objective_lens,
        req.body.C2_aperture,
        req.body.spot_size,
        req.body.defocus_range,
        req.body.delay_after_stage_shift
        ]
    ];
    pool.query(sql, [values], function(err, result) {
        res.render('show_saved');
        console.log('-----------------------------------------------------------------');
        console.log(now.toLocaleString() + ": adding value: " + JSON.stringify(req.body));
        console.log("add_result:" + JSON.stringify(result));
        console.log('-----------------------------------------------------------------\n');
    });
    
});

var data_inserted;
app.get('/data_para/:date/edit', function(req, res) {
    var now = new Date();

    var pool = mysql.createPool(sql_config);
    pool.query("SELECT * FROM data_collection_para WHERE date = '" + req.params.date + "'", function(err, rows, fields){
        var data;

        if (err){
            res.status(50).json({"status_code": 500, "status_message": "internal server error"});
        } else{

            if(rows.length==1){
                var data = {
                    'date':rows[0].date,
                    'name':rows[0].name,
                    'collected_by':rows[0].collected_by,
                    'voltage':rows[0].voltage,
                    'magnification':rows[0].magnification,
                    'exposure_time':rows[0].exposure_time,
                    'number_of_frames':rows[0].number_of_frames,
                    'pixel_size':rows[0].pixel_size,
                    'dose_rate':rows[0].dose_rate,
                    'C2_lens':rows[0].C2_lens,
                    'objective_lens':rows[0].objective_lens,
                    'C2_aperture':rows[0].C2_aperture,
                    'spot_size':rows[0].spot_size,
                    'defocus_range':rows[0].defocus_range,
                    'delay_after_stage_shift':rows[0].delay_after_stage_shift
                }
                res.render('edit_data', {
                    "data": data,
                    //url_edit: "/data_para/" + data.date + "/edit",
                });
                console.log('-----------------------------------------------------------------');
                console.log(now.toLocaleString() + ": editing detail page on " + data.date);
                console.log('-----------------------------------------------------------------\n');
                data_inserted = data.date;
                
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });

    //pool.end();
});

app.post('/data_para/:date/edit', function(req,res) {
    var now = new Date();

    var pool = mysql.createPool(sql_config);

    var sql = "INSERT INTO data_collection_para (date, name, collected_by,\
        voltage, magnification, exposure_time, number_of_frames, pixel_size, dose_rate,\
        C2_lens,objective_lens,C2_aperture,spot_size, defocus_range, delay_after_stage_shift) VALUES ?";
    var values = [
        [req.body.date, 
        req.body.name,
        req.body.collected_by,
        req.body.voltage,
        req.body.magnification,
        req.body.exposure_time,
        req.body.number_of_frames,
        req.body.pixel_size,
        req.body.dose_rate,
        req.body.C2_lens,
        req.body.objective_lens,
        req.body.C2_aperture,
        req.body.spot_size,
        req.body.defocus_range,
        req.body.delay_after_stage_shift
        ]
    ];
    var sql_delete = "DELETE FROM data_collection_para WHERE date = '" + data_inserted + "'";
    console.log("req.body:" + req.body.confirm);
    
    //console.log("value" + values);
    if (req.body.confirm == "yes"){
        pool.query(sql_delete, function(err, result){
            if(err) throw err;
            //console.log("deleted_result:" + result);
        });

        pool.query(sql, [values], function(err, result) {
            res.render('show_saved');
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": edited " + JSON.stringify(req.body)+ "\n");
            console.log("insert result:" + JSON.stringify(result));
            console.log('-----------------------------------------------------------------\n');
        });
    }else{
        pool.query(sql_delete, function(err, result){
            if(err) throw err;
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": delete " + data_inserted + "\n");
            console.log("delete result:" + JSON.stringify(result));
            console.log('-----------------------------------------------------------------\n');
            res.render('deleted');
        });
    }
});

app.get('/project/:id/sample_screen', function(req, res){
    var now = new Date();
    var pool = mysql.createPool(sql_config);

    pool.query('SELECT * FROM projectsTable WHERE id = ' + req.params.id, function(err, rows, fields){
        var project;
        if (rows.length == 1){
            var project ={
                'id':rows[0].id,
                'name':rows[0].name,
                'owner':rows[0].owner,
                'numberOfStructures':rows[0].numberOfStructures
            }
        }
        pool.query('SELECT * FROM ' + project.name, function(err, rows, fields){
            var gridList = [];
            for (var i = 0; i < rows.length; i++){
                var grid = {
                    'id':rows[i].id,
                    'date':rows[i].date/*,
                    'column':rows[i].column,
                    'buffer':rows[i].buffer,
                    'loading_volume':rows[i].loading_volume,
                    'loading_concentration':rows[i].loading_concentration,
                    'gel_filtration':rows[i].gel_filtration,
                    'protein_electrophoresis':rows[i].buffer,
                    '':rows[i].buffer,
*/              }
                //console.log("grid"  + grid);
                gridList.push(grid);
            }
            var dateHeader = [];
            dateHeader.push(gridList[0].date);
            for (var i = 1; i < gridList.length; i++){
                if (gridList[i].date != gridList[i-1].date){
                    dateHeader.push(gridList[i].date);
                }
            }
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": checking sample screening on: " + project.name + JSON.stringify(gridList));
            //console.log(project.name);
            console.log('-----------------------------------------------------------------\n');
            res.render('sample_screen', {"project": project, "gridList": gridList, "dateHeader": dateHeader});
        })
    });
});

app.get('/project/:id/data_process', function(req, res){
    var now = new Date();
    console.log('-----------------------------------------------------------------');
    console.log(now.toLocaleString() + ": checking data processing on project id: " + req.params.id);
    console.log('-----------------------------------------------------------------\n');
    res.render('data_process');

});
app.get('/:name/grid_detail/:id', function(req, res){
    var pool = mysql.createPool(sql_config);
    var now = new Date();
    pool.query("SELECT * FROM " + req.params.name + " WHERE id = " + req.params.id, function(err, rows, fields){
        var gridPara = {
            'id':rows[0].id,
            'date':rows[0].date,
            'column':rows[0].column,
            'buffer':rows[0].buffer,
            'loading_volume':rows[0].loading_volume,
            'loading_concentration':rows[0].loading_concentration,
            'gel_filtration':rows[0].gel_filtration,
            'protein_electrophoresis':rows[0].protein_electrophoresis,
            'atlas':rows[0].atlas,
            'view':rows[0].view,
            'record':rows[0].record,
            'glow_discharge':rows[0].glow_discharge,
            'blot_time':rows[0].blot_time,
            'grid_type':rows[0].grid_type,
            'sample_concentration':rows[0].sample_concentration
        } 
        //console.log("SELECT * FROM '" + req.params.name + "' WHERE id = " + req.params.id);
        console.log('-----------------------------------------------------------------');
        //console.log(JSON.stringify(rows));
        console.log(now.toLocaleString() + ": checking grid " + req.params.id + " on " + req.params.name);
        console.log('-----------------------------------------------------------------\n');
        res.render('grid_detail')//, {"gridPara": gridPara});
    });
});

app.post('/:name/grid_detail/:id', function(req, res, next){
    var now = new Date();
    
    upload(req,res,function(err){
        if(err){
            res.send(err);
        }
        else{
            console.log('-----------------------------------------------------------------');
            console.log(now.toLocaleString() + ": checking grid " + req.params.id + " on " + req.params.name);
            console.log('-----------------------------------------------------------------\n');
            res.render('grid_detail');
        }
    })
});

if(process.argv.length == 3){
    app.listen(process.argv[2]);
    console.log("Listening on " + process.argv[2]);
} else{
    console.log("Please enter the correct port");
    console.log("Usage: nodemon index.js [port]");
}

/*
app.get('/data_para/:date/delete', function(req,res){
    res.render("delete_data", {
        "date":req.params.date
    })
});

app.post('/data_para/:data/delete', function(res, req){
    console.log(req.body);
});
*/