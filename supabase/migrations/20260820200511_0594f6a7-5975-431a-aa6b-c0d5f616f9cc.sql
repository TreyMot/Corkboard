-- allow wines named only by producer
ALTER TABLE public.wine ALTER COLUMN cuvee DROP NOT NULL;

-- clear earlier test seed
DELETE FROM public.rating;
DELETE FROM public.wishlist_item;
DELETE FROM public.bottling;
DELETE FROM public.wine;

INSERT INTO public.wine (id, lwin7, producer, cuvee, varietal, region, colour, verified) VALUES
('11111111-0000-4000-8000-000000000001','DEMO','Josh Cellars','Hearth','Cabernet Sauvignon','California','red',true),
('11111111-0000-4000-8000-000000000002','DEMO','Josh Cellars','Paso Robles','Cabernet Sauvignon','Paso Robles','red',true),
('11111111-0000-4000-8000-000000000003','DEMO','Josh Cellars','Reserve','Chardonnay','North Coast','white',true),
('11111111-0000-4000-8000-000000000004','DEMO','Meiomi',NULL,'Chardonnay','California','white',true),
('11111111-0000-4000-8000-000000000005','DEMO','Ridge','Lytton Springs',NULL,'Dry Creek Valley','red',true),
('11111111-0000-4000-8000-000000000006','DEMO','Château Léoville Barton',NULL,NULL,'Saint-Julien','red',true),
('11111111-0000-4000-8000-000000000007','DEMO','Domaine Weinbach','Cuvée Théo','Riesling','Alsace','white',true),
('11111111-0000-4000-8000-000000000008','DEMO','Domäne Wachau','Federspiel','Grüner Veltliner','Wachau','white',true),
('11111111-0000-4000-8000-000000000009','DEMO','Ron Yates','Friesen Vineyards','Tempranillo','Texas High Plains','red',true),
('11111111-0000-4000-8000-000000000010','DEMO','Augusta Vin','Estate','Malbec','Texas','red',true),
('11111111-0000-4000-8000-000000000011','DEMO','Grape Creek','Bellissimo',NULL,'Texas Hill Country','red',true),
('11111111-0000-4000-8000-000000000012','DEMO','Caymus',NULL,'Cabernet Sauvignon','Napa Valley','red',true),
('11111111-0000-4000-8000-000000000013','DEMO','Kim Crawford',NULL,'Sauvignon Blanc','Marlborough','white',true),
('11111111-0000-4000-8000-000000000014','DEMO','Cloudy Bay','Te Koko','Sauvignon Blanc','Marlborough','white',true),
('11111111-0000-4000-8000-000000000015','DEMO','Bodegas Muga','Reserva',NULL,'Rioja','red',true),
('11111111-0000-4000-8000-000000000016','DEMO','Produttori del Barbaresco',NULL,'Nebbiolo','Barbaresco','red',true),
('11111111-0000-4000-8000-000000000017','DEMO','Whispering Angel',NULL,NULL,'Côtes de Provence','rose',true),
('11111111-0000-4000-8000-000000000018','DEMO','Veuve Clicquot','Yellow Label Brut',NULL,'Champagne','sparkling',true),
('11111111-0000-4000-8000-000000000019','DEMO','Radikon','Oslavje',NULL,'Friuli','orange',true),
('11111111-0000-4000-8000-000000000020','DEMO','Taylor Fladgate','20 Year Tawny',NULL,'Douro','fortified',true);

INSERT INTO public.bottling (id, wine_id, vintage, format_ml) VALUES
('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001',2024,750),
('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002',2022,750),
('22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-000000000003',2023,750),
('22222222-0000-4000-8000-000000000004','11111111-0000-4000-8000-000000000004',2022,750),
('22222222-0000-4000-8000-000000000005','11111111-0000-4000-8000-000000000005',2021,750),
('22222222-0000-4000-8000-000000000006','11111111-0000-4000-8000-000000000006',2016,750),
('22222222-0000-4000-8000-000000000007','11111111-0000-4000-8000-000000000007',2020,750),
('22222222-0000-4000-8000-000000000008','11111111-0000-4000-8000-000000000008',2022,750),
('22222222-0000-4000-8000-000000000009','11111111-0000-4000-8000-000000000009',2019,750),
('22222222-0000-4000-8000-000000000010','11111111-0000-4000-8000-000000000010',2021,750),
('22222222-0000-4000-8000-000000000011','11111111-0000-4000-8000-000000000011',2022,750),
('22222222-0000-4000-8000-000000000012','11111111-0000-4000-8000-000000000012',2020,1500),
('22222222-0000-4000-8000-000000000013','11111111-0000-4000-8000-000000000013',2023,750),
('22222222-0000-4000-8000-000000000014','11111111-0000-4000-8000-000000000014',2021,750),
('22222222-0000-4000-8000-000000000015','11111111-0000-4000-8000-000000000015',2018,750),
('22222222-0000-4000-8000-000000000016','11111111-0000-4000-8000-000000000016',2019,750),
('22222222-0000-4000-8000-000000000017','11111111-0000-4000-8000-000000000017',2023,750),
('22222222-0000-4000-8000-000000000018','11111111-0000-4000-8000-000000000018',NULL,750),
('22222222-0000-4000-8000-000000000019','11111111-0000-4000-8000-000000000019',2018,750),
('22222222-0000-4000-8000-000000000020','11111111-0000-4000-8000-000000000020',NULL,750);

INSERT INTO public.rating (id, bottling_id, user_id, stars, note, drunk_on)
SELECT v.id::uuid, v.bottling_id::uuid, p.id, v.stars, v.note, v.drunk_on::date
FROM (VALUES
('33333333-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001',3.5,'Opened this on a Tuesday with leftover chili and it did the job. Soft, a little sweet on the finish, nothing you have to think about. I would buy it again for a crowd but not for myself.','2026-08-11'),
('33333333-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000002',4.0,'Perfect with the brisket.','2026-07-29'),
('33333333-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000003',2.5,'Too much oak for what it is. Tasted like someone left a plank in the glass. Passed on a second pour.','2026-07-02'),
('33333333-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000004',3.0,NULL,'2026-06-20'),
('33333333-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000005',4.5,'Brought this to Marcy''s backyard thing and it disappeared before the ribs came off the grill. Zinfandel-heavy blend that somehow stays lively instead of turning jammy. Held up to smoke, held up to sauce, held up to being poured into plastic cups. I ordered two more the next morning.','2026-06-06'),
('33333333-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000006',5.0,'Saved this for our anniversary and it earned it. Ten years in and it is still tightening up rather than fading. We drank it slowly over three hours with a roast and the last glass was better than the first.','2026-05-24'),
('33333333-0000-4000-8000-000000000007','22222222-0000-4000-8000-000000000007',4.5,'Bone dry, which surprised the table — everyone expected sweet. Went beautifully with a pork loin and mustard.','2026-05-09'),
('33333333-0000-4000-8000-000000000008','22222222-0000-4000-8000-000000000008',4.0,'House white for the summer, I think. Cheap enough to keep two in the fridge.','2026-04-27'),
('33333333-0000-4000-8000-000000000009','22222222-0000-4000-8000-000000000009',3.5,'Texas tempranillo is a real thing now and this is the argument for it. Not as structured as a Rioja and it fell apart by day two, but for a Friday it was more than fine. Worth the drive out there.','2026-04-12'),
('33333333-0000-4000-8000-000000000010','22222222-0000-4000-8000-000000000010',2.0,'Thin and a little sharp. I wanted to like it.','2026-03-30'),
('33333333-0000-4000-8000-000000000011','22222222-0000-4000-8000-000000000011',2.5,NULL,'2026-03-15'),
('33333333-0000-4000-8000-000000000012','22222222-0000-4000-8000-000000000012',4.0,'A magnum was overkill for six people and we finished it anyway. Big, plush, slightly sweet in the way Caymus always is — nobody complained. Would not pay the magnum premium again but I am glad we did it once.','2026-02-28'),
('33333333-0000-4000-8000-000000000013','22222222-0000-4000-8000-000000000013',3.0,'Fine on the porch. Would not order it in a restaurant.','2026-02-14'),
('33333333-0000-4000-8000-000000000014','22222222-0000-4000-8000-000000000014',4.5,'This is what happens when you stop making sauvignon blanc taste like a grapefruit. Oaked, textural, almost chewy. It confused half the table and won over the other half. Pairs shockingly well with roast chicken.','2026-01-31'),
('33333333-0000-4000-8000-000000000015','22222222-0000-4000-8000-000000000015',4.0,'Reliable. Bought a case years ago and this bottle proves it was the right call.','2026-01-17'),
('33333333-0000-4000-8000-000000000016','22222222-0000-4000-8000-000000000016',4.5,'Needed two hours open before it said anything. Worth waiting for.','2026-01-03'),
('33333333-0000-4000-8000-000000000017','22222222-0000-4000-8000-000000000017',3.5,'Drank it cold on a hot day, which is the whole point. Pleasant, faintly savory, gone in an hour.','2025-12-20'),
('33333333-0000-4000-8000-000000000018','22222222-0000-4000-8000-000000000018',4.0,'New Year''s, obviously.','2025-12-31'),
('33333333-0000-4000-8000-000000000019','22222222-0000-4000-8000-000000000019',4.5,'First orange wine that made sense to me. Tannic like a red, sour like cider, tasted like dried apricot and tea. Susan hated it. I finished her glass and then most of the bottle, so make of that what you will.','2025-12-06'),
('33333333-0000-4000-8000-000000000020','22222222-0000-4000-8000-000000000020',5.0,'Ray brought this out after dinner and the room went quiet. Twenty years of tawny is a lot of caramel and walnut without ever getting cloying. We sat with it until midnight. I bought a bottle the following week and I do not regret the price.','2025-11-22')
) AS v(id, bottling_id, stars, note, drunk_on)
CROSS JOIN LATERAL (SELECT id FROM public.profile ORDER BY joined_at LIMIT 1) p;

INSERT INTO public.rating_private (rating_id, user_id, score_100)
SELECT r.id, r.user_id, s.score
FROM (VALUES
('33333333-0000-4000-8000-000000000006',96),
('33333333-0000-4000-8000-000000000014',91),
('33333333-0000-4000-8000-000000000010',78),
('33333333-0000-4000-8000-000000000020',97)
) AS s(rating_id, score)
JOIN public.rating r ON r.id = s.rating_id::uuid;

INSERT INTO public.wishlist_item (wine_id, user_id, note)
SELECT w.wine_id::uuid, p.id, w.note
FROM (VALUES
('11111111-0000-4000-8000-000000000006','Any vintage, honestly.'),
('11111111-0000-4000-8000-000000000016',NULL),
('11111111-0000-4000-8000-000000000019','After the Oslavje, want to try the rest.'),
('11111111-0000-4000-8000-000000000007',NULL),
('11111111-0000-4000-8000-000000000014','Susan says the regular bottling is better.')
) AS w(wine_id, note)
CROSS JOIN LATERAL (SELECT id FROM public.profile ORDER BY joined_at LIMIT 1) p;