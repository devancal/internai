// Match Regression Suite v2 — runs after hardening overrides and checks eligibility semantics directly.
function runMatchRegressionV2(){const cases=[
 {name:'matching-major',profile:calibrationProfile({major:'Mechanical Engineering'}),job:calibrationJob(),check:(b,j)=>{const m=structuredRequirementMap(j);return b.score>=65&&m.some(x=>x.kind==='eligibility'&&x.supported&&x.sourceType==='education')}},
 {name:'wrong-major-rejected',profile:calibrationProfile({major:'Computer Science',skills:['JavaScript'],resumeText:'Software Project\n• Built a JavaScript web application.'}),job:calibrationJob(),check:(b,j)=>{const m=structuredRequirementMap(j);return b.score<=62&&m.some(x=>x.kind==='eligibility'&&x.known&&!x.supported)}},
 {name:'gpa-pass',profile:calibrationProfile({gpa:'3.60'}),job:calibrationJob({desc:'Required: pursuing a Mechanical Engineering degree. Minimum GPA 3.0.'}),check:(b,j)=>structuredRequirementMap(j).some(x=>/gpa/i.test(x.req)&&x.supported)},
 {name:'gpa-fail',profile:calibrationProfile({gpa:'2.70'}),job:calibrationJob({desc:'Required: pursuing a Mechanical Engineering degree. Minimum GPA 3.0.'}),check:(b,j)=>structuredRequirementMap(j).some(x=>/gpa/i.test(x.req)&&x.known&&!x.supported)},
 {name:'authorization-unknown',profile:calibrationProfile(),job:calibrationJob({desc:'Required: pursuing a Mechanical Engineering degree. Must be authorized to work in the United States without sponsorship.'}),check:(b,j)=>structuredRequirementMap(j).some(x=>/authorized|sponsor/i.test(x.req)&&!x.known&&!x.supported)},
 {name:'wrong-term-cap',profile:calibrationProfile(),job:calibrationJob({season:['Fall'],year:2026}),check:b=>b.score<=42},
 {name:'hard-skill-gap',profile:calibrationProfile({skills:['Python'],resumeText:'Programming Project\n• Built Python scripts for data analysis.'}),job:calibrationJob({skills:['SolidWorks','GD&T'],desc:'Required: SolidWorks and GD&T experience. Pursuing Mechanical Engineering degree.'}),check:(b,j)=>b.score<=72&&structuredRequirementMap(j).some(x=>x.kind==='required'&&!x.supported)},
 {name:'sparse-listing-bounded',profile:calibrationProfile(),job:calibrationJob({skills:[],degreeFields:[],desc:'Engineering internship opportunity.',location:'Location not listed',season:['Unspecified'],year:null}),check:b=>b.score<=74}
];const results=cases.map(c=>withCalibrationProfile(c.profile,()=>{const b=calibratedMatchBreakdown(c.job),map=structuredRequirementMap(c.job);let pass=false,error=null;try{pass=!!c.check(b,c.job)}catch(e){error=String(e.message||e)}return{name:c.name,pass,score:b.score,coverage:Math.round((b.requirementCoverage||0)*100),risk:Math.round((b.hardRequirementRisk||0)*100),requirements:map.length,error}}));return{version:2,passed:results.every(x=>x.pass),results,ranAt:new Date().toISOString()}}
window.internAIMatchRegression=runMatchRegressionV2;
const matchRegressionV2=runMatchRegressionV2();
window.internAIMatchRegressionResult=matchRegressionV2;
if(!matchRegressionV2.passed)console.error('InternAI Match Regression v2 failed',matchRegressionV2);else console.info('InternAI Match Regression v2 passed',matchRegressionV2);

// Run legacy calibration only after all matching overrides are installed.
const matchCalibration=runMatchCalibration();
window.internAIMatchCalibrationResult=matchCalibration;
if(!matchCalibration.passed)console.warn('InternAI match calibration guardrail failed',matchCalibration);
