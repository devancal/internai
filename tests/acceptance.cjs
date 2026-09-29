const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime.cjs');
const imeg=`This paid, mentored internship offers real project experience alongside experienced engineers and consultants.
What You'll Do
Assist with design portions of mechanical-system projects.
What You'll Bring
Required Education
Completed at least 2 years towards a Bachelor of Science (BS) Degree in Mechanical Engineering, or equivalent required
Required Skills/Abilities
Proficient with MS Office Suite including, but not limited to, Word, Excel, and Outlook
Skilled in AutoCAD and/or Building Information Modeling (BIM) software
Preferred
Prior internship experience in the building design consulting industry preferred
About the Team
The portfolio is centered on major healthcare projects.
Why IMEG
A paid internship with real, hands-on project work, not busywork`;
test('live acceptance: IMEG headings and benefits are not qualifications; CAD is not AutoCAD/BIM',()=>{
 const r=runtime();r.ctx.description=imeg;
 const out=r.run(`withCalibrationProfile(calibrationProfile({skills:['CAD','Excel'],resumeText:'Example University\\nBachelor of Science in Mechanical Engineering May 2029\\n• Relevant Coursework: Physics, CAD'}),()=>structuredRequirementMap(calibrationJob({desc:description,skills:[],degreeFields:['Mechanical']})))`);
 assert.equal(out.length,5);
 assert.ok(out.some(x=>x.req.includes('AutoCAD')&&!x.supported));
 assert.ok(out.some(x=>x.req.includes('MS Office')&&!x.supported));
 assert.ok(out.some(x=>x.req.includes('Prior internship')&&x.kind==='preferred'));
 assert.ok(!out.some(x=>/mentored|portfolio|Required Education|Skills\/Abilities|paid internship/.test(x.req)));
});
test('live acceptance: explicit AutoCAD evidence satisfies the software alternative',()=>{
 const r=runtime();r.ctx.description=imeg;
 assert.equal(r.run(`withCalibrationProfile(calibrationProfile({skills:['AutoCAD'],resumeText:''}),()=>structuredRequirementMap(calibrationJob({desc:description,skills:[]})).find(x=>x.req.includes('AutoCAD')).supported)`),true);
});
test('live acceptance: cookie boilerplate and incomplete degree metadata do not contradict listed alternatives',()=>{
 const r=runtime();const out=r.run(`withCalibrationProfile(calibrationProfile(),()=>structuredRequirementMap(calibrationJob({degreeFields:['Materials'],skills:[],desc:"Your experience of the site may be impacted if you do not accept all cookies.\\nMANUFACTURING & OPERATIONS\\nSTUDENT & GRADUATES\\nBasic Qualifications\\nCurrently pursuing a bachelor's degree in engineering\\nEligible to work without sponsorship\\nPreferred Qualifications\\nAn engineering degree in any of the following disciplines: Mechanical, Electrical, Chemical, Industrial, Material Science, Welding, or Packaging.\\nMinimum overall GPA of 3.0"})))`);
 assert.ok(!out.some(x=>/cookies|OPERATIONS|GRADUATES|Accepted degree fields/.test(x.req)));
 assert.ok(out.some(x=>x.req.includes('disciplines')&&x.supported));
 assert.ok(out.some(x=>x.req.includes('sponsorship')&&!x.known));
});
test('live acceptance: migrated graph retains full bullets and specific project names',()=>{
 const r=runtime();r.run(`state.profile.resumeText='ENGINEERING PROJECTS\\nV8 Engine Internal Combustion Design Jan 2026 - Mar 2026\\nPersonal Project | SolidWorks, Onshape\\n• Designed a multi-component model using parametric CAD and\\nassembly constraints.\\n• Validated motion to evaluate mechanical behavior\\nand component relationships.\\nLEADERSHIP & INVOLVEMENT';state.profile.careerGraph={version:3,nodes:[],claims:[]}`);
 const graph=r.run('ensureCareerGraph()');assert.equal(graph.version,4);assert.equal(graph.claims.length,2);
 assert.match(graph.nodes[0].title,/V8 Engine.*Personal Project/);
 assert.equal(graph.claims[0].text,'Designed a multi-component model using parametric CAD and assembly constraints.');
 assert.equal(graph.claims[1].text,'Validated motion to evaluate mechanical behavior and component relationships.');
});
test('GPA with robotics minor remains education and preserves decimal in title',()=>{const r=runtime();assert.equal(r.run(`evidenceTypeFor("GPA: 3.86 | Minors: Mathematics, Robotics")`),'Education');assert.equal(r.run(`evidenceTitleFor("GPA: 3.86 | Minors: Mathematics, Robotics")`),'GPA: 3.86')});
