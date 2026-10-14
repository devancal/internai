const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime.cjs');

test('Lever preserves qualifications and closing authorization policies for matching',async()=>{
 const {createHandler}=require('../api/jobs');
 const posting={id:'fixture',text:'Piping Internship Summer 2027',hostedUrl:'https://jobs.lever.co/example/fixture',descriptionPlain:'Help prepare engineering drawings.',lists:[{text:'Qualifications',content:'<ul><li>Currently pursuing Mechanical Engineering.</li><li>Proficient in Excel and Word.</li><li>AutoCAD or other drafting software desired.</li></ul>'}],additional:'<h3>Equal Opportunity Employer</h3><p>All applicants welcome.</p><h3>Sponsorship &amp; Work Authorization</h3><p>Candidates must be authorized to work in the United States without sponsorship.</p>'};
 const res={setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
 await createHandler(async url=>new Response(url.includes('lever.co')?JSON.stringify([posting]):url.includes('greenhouse')?'{"jobs":[]}':url.includes('workday')?'{"jobPostings":[],"total":0}':'<html></html>'))({method:'GET'},res);
 const job=res.body.jobs[0];assert.ok(job.desc.includes('Qualifications\n'));assert.ok(job.desc.includes('Excel and Word.'));assert.ok(job.desc.includes('without sponsorship.'));
 const r=runtime();r.ctx.job=job;
 const map=r.run("withCalibrationProfile(calibrationProfile({skills:['CAD','Excel'],resumeText:''}),()=>structuredRequirementMap(job))");
 assert.ok(map.some(x=>x.req.includes('Word')&&!x.supported));
 assert.ok(map.some(x=>x.req.includes('without sponsorship')&&x.kind==='eligibility'&&!x.supported&&!x.known));
});

test('match details expose the same missing skills and eligibility as preparation',()=>{
 const r=runtime();r.run("state.profile=calibrationProfile({skills:['CAD','Excel'],resumeText:''});jobsData=[calibrationJob({id:'acceptance',desc:'Qualifications\\nRequired: AutoCAD and Word.\\nMust be authorized to work in the United States.'})];openJob('acceptance')");
 const html=r.ctx.document.getElementById('page').innerHTML;
 assert.ok(html.includes('Employer requirements and eligibility'));assert.ok(html.includes('AutoCAD'));assert.ok(html.includes('Gap'));assert.ok(html.includes('Needs review'));assert.ok(!html.includes('No additional detected skills.'));
});
