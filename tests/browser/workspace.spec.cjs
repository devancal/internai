const {test,expect}=require('@playwright/test');
const job={id:'qa-role',company:'QA Employer',title:'Mechanical Engineering Intern',location:'Cleveland, OH',mode:'On-site',season:['Summer'],year:2027,live:true,source:'QA feed',applyUrl:'https://example.com/job',skills:['CAD'],desc:'Required Qualifications\nPursuing Mechanical Engineering\nKnowledge of CAD'};
test.beforeEach(async({page})=>{
 // No production account, employer submission, email or paid service is touched.
 await page.route('https://**/*',route=>route.abort());
 await page.route('**/api/**',route=>route.fulfill({json:{jobs:route.request().url().includes('midwest')?[]:[job],updatedAt:'2026-09-21T00:00:00Z'}}));
});
async function openWorkspace(page){await page.goto('/');await page.getByRole('button',{name:'Start free →',exact:true}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible()}
test('landing and workspace fit the viewport without horizontal overflow',async({page})=>{await page.goto('/');await expect(page.locator('#how .feature')).toHaveCount(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Start free →',exact:true}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)});
test('import, edit, download, track, reload keeps user materials',async({page})=>{
 await openWorkspace(page);await page.locator('[data-page="jobs"]').click();await expect(page.getByText(/Last refresh:/)).toBeVisible();await page.getByRole('button',{name:'Add a job you found',exact:true}).click();
 await page.locator('#importUrl').fill('https://example.com/job');await page.locator('#importTitle').fill('QA Mechanical Intern');await page.locator('#importCompany').fill('QA Company');await page.locator('#importDesc').fill('Summer 2027 mechanical engineering internship. CAD experience required.');await page.getByRole('button',{name:'Analyze & create workspace →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Application Workspace',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tailor my resume',exact:true}).click();await page.locator('#tailoredResumeDraft').fill('QA reviewed source material');
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-resume-view="tailored"]').getByRole('button',{name:'Download text',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('tailored-resume.txt');
 await page.getByRole('button',{name:'Continue to application →',exact:true}).click();await expect(page.getByRole('button',{name:'Open application site ↗',exact:true})).toBeVisible();await page.getByRole('button',{name:'I submitted it ✓',exact:true}).click();await expect(page.locator('#astatus')).toHaveValue('Applied');
 await page.reload();await page.getByRole('button',{name:'Start free →',exact:true}).click();await page.locator('[data-page="applications"]').click();await page.getByRole('button',{name:'Open',exact:true}).click();await expect(page.locator('#tailoredResumeDraft')).toHaveValue('QA reviewed source material');
});
test('workspace deep link starts after all scripts load',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#app');await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();expect(errors).toEqual([])});
