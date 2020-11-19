/*
core process for this nodejs server
author: Ningkun Zhou
email: nzhou26@outlook.com
Haven't written a initailization scripts yet, you have to install mysql by yourself
*/
var express = require('express');
var bodyParser =require('body-parser');
var multer = require('multer');
var app = express();
var mysql = require('mysql');
var sql_config = require('./sql_config');
const path = require('path');
const url = require("url");
var log_format = require('./log_format');
//const morgan = require('morgan');

app.set('view engine', 'pug');
app.set('views', './views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(upload.array()); 
app.use(express.static(path.join(__dirname, '../uploads')));
app.use('../uploads', express.static(path.join(__dirname, '../uploads')));
//app.use(morgan('dev'));

function isEmpty(obj){
    for (var key in obj){
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

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
})//.single(file_img);

app.post('/:name/grid_detail/:id/:image', upload.single("file"), function(req, res) {
    
    //var file_img = req.params.image;
    var pool = mysql.createPool(sql_config);
    var sql_update = "UPDATE " + req.params.name +
    " SET " + req.params.image + " = '" + req.file.filename +
    "' WHERE id = " + req.params.id;
    //log_format(sql_update);

    if (!req.file){
        log_format("no file received")
        return res.send({
            success:false
        });
    } else{
        pool.query(sql_update, function(err, rows, result){
            if (err){
                log_format("insert err " + JSON.stringify(err))
            } else {
                log_format(req.params.image + ' file received')
                res.redirect('/' + req.params.name + '/grid_detail/' + req.params.id);
            };
        });
    };
});

app.get('/', function(req, res){
    
    res.render('home_page',{
        url_project:"/project",
        url_data_para:"/data_para"
    });
    log_format("checking homepage");
});

app.get('/project', function(req, res){
    var projectsList = [];
    var pool = mysql.createPool(sql_config);
    var sql = 'SELECT * FROM projectsTable';
    var passed = req.query.valid;
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
            if (passed == "adding"){
                log_format("adding projects");
                res.render('project',{"projectsList":projectsList, "adding":true});
            } else if (passed == "deleting"){
                log_format("deleting projects");
                res.render('project',{"projectsList":projectsList, "deleting":true})
            } else{
                log_format("checking projects");
                res.render('project',{"projectsList":projectsList});
            }
            
        }        
           
    });
    //pool.end();
});
app.post('/project', function(req, res){
    if (req.body.kind == "adding"){
        log_format("redirect to adding project")
        res.redirect(url.format({
            pathname:"/project",
            query:{
                //"a":1,
                //"b":2,
                "valid":"adding"
            }
        }));
    } else if (req.body.kind == "deleting"){
        log_format("redirecting to deleting project");
        res.redirect(url.format({
            pathname:"/project",
            query:{
                "valid":"deleting"
            }
        }))
    }
});
app.post('/project/add', function(req,res){
    var pool = mysql.createPool(sql_config);
    var sql_insert = "INSERT INTO projectsTable (name, owner, numberOfStructures) VALUES ?";
    var sql_sentence = "CREATE TABLE " + req.body.name + " (id INT NOT NULL PRIMARY KEY, date VARCHAR(45), \
    `column` VARCHAR(45), buffer VARCHAR(45),loading_volume VARCHAR(45), loading_concentration VARCHAR(45),\
    glow_discharge VARCHAR(45), blot_time VARCHAR(45), blot_force VARCHAR(45), grid_type VARCHAR(45),\
    sample_concentration VARCHAR(45), gel_filtration VARCHAR(45), protein_electrophoresis VARCHAR(45), img_list VARCHAR(45))" ;
    var values =[
        [req.body.name,
        req.body.owner,
        req.body.numberOfStructures
        ]
    ];
    pool.query(sql_insert, [values], function(err, result){
        if (err){
            console.log(err);
        } else{
            pool.query(sql_sentence, function(err, result){
                if (err){
                    console.log(err);
                } else{
                    res.redirect('/project');
                    log_format("added project " + req.body.name);
                }
            });
        }
    })
});
app.post('/project/delete', function(req, res){
    var pool = mysql.createPool(sql_config);
    pool.query("SELECT * FROM projectsTable WHERE id = " + req.body.id, function(err, rows, result){
        if (err){
            res.send("no such an id " + err)
        } else {
            var project_name = rows[0].name;
            pool.query("DELETE FROM projectsTable WHERE id = " + req.body.id, function(err, rows, result){
                if(err){
                    res.send("failed to delete");
                } else {
                    pool.query("DROP TABLE " + project_name, function(err){
                        if(err){
                            res.send("drop error" + err)
                        } else{
                            res.redirect('/project')
                        }
                    })
                }
            })
        }
    })
    
    
    log_format(JSON.stringify(req.body))
})
app.get('/project/:id', function(req,res){
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
                log_format("checking project " + project.name)
                res.render('details', {"project": project});
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });
});

app.get('/project/:id/sample_screen', function(req, res){
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
        };
        pool.query('SELECT * FROM ' + project.name, function(err, rows, fields){
            if (err || isEmpty(rows[0])){
                if(req.query.valid == "adding"){
                    log_format("adding grids on: " + project.name)
                    res.render('sample_screen', {'project':project, "adding":true})
                } else {
                    log_format("checking sample screening on: " + project.name)
                    res.render('sample_screen', {"project":project});
                }
            } else{
                var gridList = [];
                for (var i = 0; i < rows.length; i++){
                    var grid = {
                        'id':rows[i].id,
                        'date':rows[i].date
                    }
                    gridList.push(grid);
                }
                var dateHeader = [];
                dateHeader.push(gridList[0].date);
                for (var i = 1; i < gridList.length; i++){
                    if (gridList[i].date != gridList[i-1].date){
                        dateHeader.push(gridList[i].date);
                    }
                }
                if (req.query.valid == "adding"){
                    log_format("adding grids on: " + project.name)
                    res.render('sample_screen', {
                        "project":project, 
                        "gridList":gridList, 
                        "dateHeader": dateHeader,
                        "adding":true
                    });
                } else{
                    log_format("checking sample screening on: " + project.name)
                    res.render('sample_screen', {
                        "project": project, 
                        "gridList": gridList, 
                        "dateHeader": dateHeader
                    });
                }
            }
        })
    });
});

app.post('/project/:id/sample_screen/', function(req,res){
    log_format("redirecting to adding grids on project #" + req.params.id);
    res.redirect(url.format({
        pathname:'/project/' + req.params.id + '/sample_screen/',
        query:{"valid":"adding"}
    }));
})

app.post('/project/:id/sample_screen/add', function(req, res){
    var pool = mysql.createPool(sql_config);
    var project;
    pool.query("SELECT * FROM projectsTable WHERE id = " + req.params.id, function(err, rows, result){
        project ={
            'id':rows[0].id,
            'name':rows[0].name
        };
        var date_grid = req.body.date;
        var date_parsed = req.body.date.split("-");
        var date_joined = date_parsed[0] + date_parsed[1] + date_parsed[2];
        var gridList = [];
        for (var i = 1; i <parseInt(req.body.numberOfGrids) +1; i ++){
            var id = date_joined + i;
            var grid= [
                id,
                date_grid
            ];
            gridList.push(grid);
        };
        
        var sql_insert = "INSERT INTO " + project.name + " (id, date) VALUES ?"
        console.log(sql_insert);
        pool.query(sql_insert, [gridList], function(err, rows, result){
            if (err){
                console.log("insert err" + JSON.stringify(result));
            } else{
                log_format("added grids on project #" + req.params.id)
                res.redirect('/project/' + req.params.id + '/sample_screen/')
            };
        });
        
    });
});
app.get('/project/:id/data_process', function(req, res){
    log_format("checking data processing on project id: " + req.params.id)
    res.render('data_process');
});
app.get('/:name/grid_detail/:id', function(req, res){
    var pool = mysql.createPool(sql_config);
    var passed = req.query.valid;
    pool.query("SELECT * FROM " + req.params.name + " WHERE id = " + req.params.id, function(err, rows, fields){
        var gridPara = {
            'id':rows[0].id,
            'date':rows[0].date,
            'Column':rows[0].column,
            'Buffer':rows[0].buffer,
            'Loading Volume':rows[0].loading_volume,
            'Loading Concentration':rows[0].loading_concentration,
            'Glow Discharge':rows[0].glow_discharge,
            'Blot Time':rows[0].blot_time,
            'Blot Force':rows[0].blot_force,
            'Grid Type':rows[0].grid_type,
            'Sample Concentration':rows[0].sample_concentration,
            'gel_filtration':rows[0].gel_filtration,
            'protein_electrophoresis':rows[0].protein_electrophoresis,
            'name':req.params.name
        }
        var img_list = {

        }
        log_format(JSON.stringify(rows[0].montage))
        if (passed == "biochem"){
            res.render('grid_detail', {"gridPara": gridPara, "biochem":true});
            log_format("editing biochem info on grid " + gridPara.id + " of project " + gridPara.name);
        } else if (passed == "sample_making"){
            res.render('grid_detail', {"gridPara":gridPara, "sample_making":true});
            log_format("editing sample making info on grid " + gridPara.id + " of project " + gridPara.name);
        } else{
            res.render('grid_detail', {"gridPara": gridPara});
            log_format("checking grid " + gridPara.id + " of project " +gridPara.name);
        }
    });
});

app.post('/:name/grid_detail/:id', function(req, res){
    /*
    upload(req,res,function(err){
        if(err){
            res.send(err);
        }
        else{
            log_format("upload info for grid " + req.params.id + " on " + req.params.name)
        }
    });
    */
    if (req.body.kind == "biochem"){
        log_format("redirecting to editing biochem on grid " + req.params.id + " of project " + req.params.name)
        res.redirect(url.format({
            pathname: "/" + req.params.name + '/grid_detail/' + req.params.id,
            query:{
                "valid":"biochem"
            }
        }));
    } else if (req.body.kind == "sample_making") {
        log_format("redirecting to editing sample making on grid " + req.params.id + " of project " + req.params.name)
        res.redirect(url.format({
            pathname: "/" + req.params.name + "/grid_detail/" + req.params.id,
            query:{
                "valid":"sample_making"
            }
        }));
    };
    
    
});

app.post('/:name/grid_detail/:id/sample_making', function(req, res){
    var pool = mysql.createPool(sql_config);
    var values = Object.values(req.body);
    
    var sql_update = "UPDATE " + req.params.name + 
    " SET glow_discharge = '" + values[0] +
    "', blot_time = '" + values[1] + 
    "', blot_force = '" + values[2] +
    "', grid_type = '" + values[3] +
    "', sample_concentration = '" + values[4] +
    "' WHERE id = " + req.params.id;
    //console.log(sql_update);
    pool.query(sql_update, function(err, rows, result){
        if (err){
            log_format("insert err " + JSON.stringify(err));
        } else {
            log_format("successfully edited sample making parameters, redirecting to grid" + req.params.id +"detail")
            res.redirect('/' + req.params.name + '/grid_detail/' + req.params.id );
        }
    })
    
});
app.post('/:name/grid_detail/:id/biochem', function(req, res){
    var pool = mysql.createPool(sql_config);
    var values = Object.values(req.body);
    console.log(JSON.stringify(values));
    var sql_update = "UPDATE " + req.params.name + 
    " SET `column` = '" + values[0] +
    "', buffer = '" + values[1] + 
    "', loading_volume = '" + values[2] +
    "', loading_concentration = '" + values[3] +
    "' WHERE id = " + req.params.id;
    console.log(sql_update);
    pool.query(sql_update, function(err, rows, result){
        if (err){
            console.log("insert err " + JSON.stringify(err));
        } else {
            log_format("successfully edited sample making parameters, redirecting to grid" + req.params.id +"detail")
            res.redirect('/' + req.params.name + '/grid_detail/' + req.params.id );
        }
    })
    
});
app.get('/data_para', function(req,res){
    
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
            log_format("checking data parameters")
            res.render('data_para',{"data_para_list":data_para_list});
        }
        
    });
});

app.get('/data_para/:date', function(req,res){
    
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
                log_format("checking data parameters: " + data.date);
                res.render('data_details', {
                    "data": data
                });
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });

});

app.get('/add_data', function(req, res){
    log_format("adding data")
    res.render('add_data');
});

app.post('/add_data', function(req,res) {
    

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
        log_format(": adding value: " + JSON.stringify(req.body));
    });
    
});

var data_inserted;
app.get('/data_para/:date/edit', function(req, res) {
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
                });
                log_format("editing detail page on " + data.date);
                data_inserted = data.date;
                
            } else{
                res.status(404).json({"status_code":404, "status_message": "Not found"});
            }
        }
    });

});

app.post('/data_para/:date/edit', function(req,res) {
    

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
            log_format("edited " + JSON.stringify(req.body));
        });
    }else{
        pool.query(sql_delete, function(err, result){
            if(err) throw err;
            log_format("delete " + data_inserted);
            res.render('deleted');
        });
    }
});


app.get('*', function(req, res){
    res.send('Sorry, this is an invalid URL.');
});

if(process.argv.length == 3){
    app.listen(process.argv[2]);
    console.log("Listening on " + process.argv[2]);
} else{
    console.log("Please enter the correct port");
    console.log("Usage: nodemon index.js [port]");
}
