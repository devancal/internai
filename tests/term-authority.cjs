const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime.cjs');
test('title term prevents incidental summer project text from confirming a spring job',()=>{
 const r=runtime();r.run("jobFilters.semester='Summer';jobsData=[{id:'spring',title:'Cybersecurity Internship - Spring 2027',season:['Spring','Summer'],year:2027,desc:'Spring internships run January through May. Work on one bigger summer project.'}]");
 assert.equal(r.run('targetTermConfirmed(jobsData[0])'),false);
 assert.equal(r.run('calibratedTermFit(jobsData[0])'),.15);
 assert.equal(r.run('termLabel(jobsData[0])'),'Spring 2027');
 assert.equal(r.run('filteredJobs().length'),0);
 r.run("jobFilters.semester='Spring'");assert.equal(r.run('filteredJobs().length'),1);
});
test('explicit multiple title seasons and untitled-term metadata remain supported',()=>{
 const r=runtime();
 assert.equal(r.run("effectiveJobSeasons({title:'Spring/Summer 2027 Intern',season:['Fall']}).join(',')"),'Spring,Summer');
 assert.equal(r.run("effectiveJobSeasons({title:'Engineering Intern',season:['Summer']}).join(',')"),'Summer');
 assert.equal(r.run("effectiveJobSeasons({title:'Engineering Intern'}).join(',')"),'Unspecified');
});
