-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by members" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- wines
CREATE TABLE public.wines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  producer text NOT NULL,
  vintage int,
  varietal text,
  region text,
  country text,
  search_doc tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(producer,'') || ' ' || coalesce(region,'') || ' ' || coalesce(varietal,'') || ' ' || coalesce(country,''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wines_search_idx ON public.wines USING gin (search_doc);
CREATE INDEX wines_trgm_name_idx ON public.wines (lower(name));
GRANT SELECT ON public.wines TO authenticated;
GRANT ALL ON public.wines TO service_role;
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wines readable by members" ON public.wines FOR SELECT TO authenticated USING (true);

-- ratings
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  stars numeric(2,1) NOT NULL CHECK (stars >= 0.5 AND stars <= 5 AND (stars * 2) = floor(stars * 2)),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  tasted_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wine_id)
);
CREATE INDEX ratings_user_idx ON public.ratings (user_id, created_at DESC);
CREATE INDEX ratings_wine_idx ON public.ratings (wine_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable by members" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own ratings insert" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ratings update" ON public.ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ratings delete" ON public.ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- want_to_try
CREATE TABLE public.want_to_try (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wine_id)
);
CREATE INDEX want_user_idx ON public.want_to_try (user_id, added_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.want_to_try TO authenticated;
GRANT ALL ON public.want_to_try TO service_role;
ALTER TABLE public.want_to_try ENABLE ROW LEVEL SECURITY;
CREATE POLICY "want readable by members" ON public.want_to_try FOR SELECT TO authenticated USING (true);
CREATE POLICY "own want insert" ON public.want_to_try FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own want delete" ON public.want_to_try FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- follows
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_follower_idx ON public.follows (follower_id);
CREATE INDEX follows_followee_idx ON public.follows (followee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable by members" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "own follows insert" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "own follows delete" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER ratings_set_updated_at BEFORE UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- catalog seed
INSERT INTO public.wines (name, producer, vintage, varietal, region, country) VALUES
('Château Margaux','Château Margaux',2015,'Cabernet Sauvignon Blend','Margaux, Bordeaux','France'),
('Château Margaux','Château Margaux',2010,'Cabernet Sauvignon Blend','Margaux, Bordeaux','France'),
('Château Latour','Château Latour',2009,'Cabernet Sauvignon Blend','Pauillac, Bordeaux','France'),
('Château Lafite Rothschild','Château Lafite Rothschild',2016,'Cabernet Sauvignon Blend','Pauillac, Bordeaux','France'),
('Château Mouton Rothschild','Château Mouton Rothschild',2014,'Cabernet Sauvignon Blend','Pauillac, Bordeaux','France'),
('Château Haut-Brion','Château Haut-Brion',2012,'Cabernet Sauvignon Blend','Pessac-Léognan, Bordeaux','France'),
('Château Pichon Baron','Château Pichon Baron',2016,'Cabernet Sauvignon Blend','Pauillac, Bordeaux','France'),
('Château Léoville Las Cases','Château Léoville Las Cases',2015,'Cabernet Sauvignon Blend','Saint-Julien, Bordeaux','France'),
('Château Cos d''Estournel','Château Cos d''Estournel',2010,'Cabernet Sauvignon Blend','Saint-Estèphe, Bordeaux','France'),
('Château Palmer','Château Palmer',2011,'Merlot Blend','Margaux, Bordeaux','France'),
('Château Cheval Blanc','Château Cheval Blanc',2012,'Cabernet Franc Blend','Saint-Émilion, Bordeaux','France'),
('Château Ausone','Château Ausone',2014,'Cabernet Franc Blend','Saint-Émilion, Bordeaux','France'),
('Pétrus','Pétrus',2011,'Merlot','Pomerol, Bordeaux','France'),
('Le Pin','Le Pin',2013,'Merlot','Pomerol, Bordeaux','France'),
('Château d''Yquem','Château d''Yquem',2009,'Sémillon','Sauternes, Bordeaux','France'),
('Château Angélus','Château Angélus',2015,'Merlot Blend','Saint-Émilion, Bordeaux','France'),
('Château Talbot','Château Talbot',2016,'Cabernet Sauvignon Blend','Saint-Julien, Bordeaux','France'),
('Château Gloria','Château Gloria',2018,'Cabernet Sauvignon Blend','Saint-Julien, Bordeaux','France'),
('Romanée-Conti Grand Cru','Domaine de la Romanée-Conti',2015,'Pinot Noir','Vosne-Romanée, Burgundy','France'),
('La Tâche Grand Cru','Domaine de la Romanée-Conti',2014,'Pinot Noir','Vosne-Romanée, Burgundy','France'),
('Richebourg Grand Cru','Domaine Leroy',2012,'Pinot Noir','Vosne-Romanée, Burgundy','France'),
('Clos de Vougeot Grand Cru','Domaine Méo-Camuzet',2017,'Pinot Noir','Côte de Nuits, Burgundy','France'),
('Chambertin Grand Cru','Domaine Armand Rousseau',2016,'Pinot Noir','Gevrey-Chambertin, Burgundy','France'),
('Gevrey-Chambertin Village','Domaine Denis Mortet',2019,'Pinot Noir','Gevrey-Chambertin, Burgundy','France'),
('Nuits-Saint-Georges 1er Cru Les Saint-Georges','Domaine Henri Gouges',2018,'Pinot Noir','Nuits-Saint-Georges, Burgundy','France'),
('Volnay 1er Cru Clos des Chênes','Domaine Michel Lafarge',2018,'Pinot Noir','Volnay, Burgundy','France'),
('Pommard 1er Cru Les Rugiens','Domaine de Courcel',2017,'Pinot Noir','Pommard, Burgundy','France'),
('Beaune 1er Cru Grèves','Joseph Drouhin',2019,'Pinot Noir','Beaune, Burgundy','France'),
('Montrachet Grand Cru','Domaine Ramonet',2016,'Chardonnay','Puligny-Montrachet, Burgundy','France'),
('Corton-Charlemagne Grand Cru','Bonneau du Martray',2017,'Chardonnay','Corton, Burgundy','France'),
('Meursault 1er Cru Perrières','Domaine Coche-Dury',2016,'Chardonnay','Meursault, Burgundy','France'),
('Puligny-Montrachet 1er Cru Les Combettes','Domaine Leflaive',2018,'Chardonnay','Puligny-Montrachet, Burgundy','France'),
('Chablis Grand Cru Les Clos','Domaine William Fèvre',2019,'Chardonnay','Chablis, Burgundy','France'),
('Chablis 1er Cru Montée de Tonnerre','Domaine Raveneau',2018,'Chardonnay','Chablis, Burgundy','France'),
('Pouilly-Fuissé','Domaine Ferret',2020,'Chardonnay','Mâconnais, Burgundy','France'),
('Hermitage La Chapelle','Paul Jaboulet Aîné',2015,'Syrah','Hermitage, Rhône','France'),
('Hermitage Rouge','Jean-Louis Chave',2016,'Syrah','Hermitage, Rhône','France'),
('Côte-Rôtie La Landonne','E. Guigal',2014,'Syrah','Côte-Rôtie, Rhône','France'),
('Côte-Rôtie Brune et Blonde','E. Guigal',2017,'Syrah','Côte-Rôtie, Rhône','France'),
('Cornas Reynard','Thierry Allemand',2017,'Syrah','Cornas, Rhône','France'),
('Condrieu','Georges Vernay',2019,'Viognier','Condrieu, Rhône','France'),
('Châteauneuf-du-Pape Réserve des Célestins','Domaine Henri Bonneau',2010,'Grenache Blend','Châteauneuf-du-Pape, Rhône','France'),
('Châteauneuf-du-Pape','Château de Beaucastel',2016,'Grenache Blend','Châteauneuf-du-Pape, Rhône','France'),
('Châteauneuf-du-Pape Cuvée Tradition','Domaine du Vieux Télégraphe',2018,'Grenache Blend','Châteauneuf-du-Pape, Rhône','France'),
('Gigondas','Domaine Santa Duc',2019,'Grenache Blend','Gigondas, Rhône','France'),
('Côtes du Rhône','E. Guigal',2020,'Grenache Blend','Rhône Valley','France'),
('Sancerre Les Monts Damnés','Domaine Vacheron',2021,'Sauvignon Blanc','Sancerre, Loire','France'),
('Pouilly-Fumé Silex','Domaine Didier Dagueneau',2019,'Sauvignon Blanc','Pouilly-Fumé, Loire','France'),
('Vouvray Le Mont Sec','Domaine Huet',2020,'Chenin Blanc','Vouvray, Loire','France'),
('Savennières Clos de la Coulée de Serrant','Nicolas Joly',2018,'Chenin Blanc','Savennières, Loire','France'),
('Chinon Les Picasses','Charles Joguet',2019,'Cabernet Franc','Chinon, Loire','France'),
('Muscadet Sèvre et Maine Sur Lie','Domaine de la Pépière',2021,'Melon de Bourgogne','Muscadet, Loire','France'),
('Riesling Grand Cru Schlossberg','Domaine Weinbach',2019,'Riesling','Alsace','France'),
('Riesling Clos Sainte Hune','Trimbach',2016,'Riesling','Alsace','France'),
('Gewürztraminer Cuvée Théo','Domaine Weinbach',2020,'Gewürztraminer','Alsace','France'),
('Cristal','Louis Roederer',2014,'Champagne Blend','Champagne','France'),
('Dom Pérignon','Moët & Chandon',2013,'Champagne Blend','Champagne','France'),
('La Grande Année','Bollinger',2014,'Champagne Blend','Champagne','France'),
('Grande Cuvée Brut',' Krug',NULL,'Champagne Blend','Champagne','France'),
('Brut Réserve','Charles Heidsieck',NULL,'Champagne Blend','Champagne','France'),
('Blanc de Blancs Grand Cru','Pierre Péters',NULL,'Chardonnay','Champagne','France'),
('Comtes de Champagne Blanc de Blancs','Taittinger',2012,'Chardonnay','Champagne','France'),
('Substance','Jacques Selosse',NULL,'Chardonnay','Champagne','France'),
('Sassicaia','Tenuta San Guido',2018,'Cabernet Sauvignon Blend','Bolgheri, Tuscany','Italy'),
('Ornellaia','Tenuta dell''Ornellaia',2017,'Cabernet Sauvignon Blend','Bolgheri, Tuscany','Italy'),
('Masseto','Masseto',2016,'Merlot','Bolgheri, Tuscany','Italy'),
('Tignanello','Antinori',2019,'Sangiovese Blend','Tuscany','Italy'),
('Solaia','Antinori',2016,'Cabernet Sauvignon Blend','Tuscany','Italy'),
('Brunello di Montalcino','Biondi-Santi',2015,'Sangiovese','Montalcino, Tuscany','Italy'),
('Brunello di Montalcino','Soldera Case Basse',2013,'Sangiovese','Montalcino, Tuscany','Italy'),
('Brunello di Montalcino Tenuta Nuova','Casanova di Neri',2017,'Sangiovese','Montalcino, Tuscany','Italy'),
('Chianti Classico Riserva','Castello di Ama',2018,'Sangiovese','Chianti Classico, Tuscany','Italy'),
('Chianti Classico Gran Selezione','Fontodi',2018,'Sangiovese','Chianti Classico, Tuscany','Italy'),
('Vino Nobile di Montepulciano','Avignonesi',2018,'Sangiovese','Montepulciano, Tuscany','Italy'),
('Barolo Monfortino Riserva','Giacomo Conterno',2013,'Nebbiolo','Barolo, Piedmont','Italy'),
('Barolo Cannubi','Paolo Scavino',2017,'Nebbiolo','Barolo, Piedmont','Italy'),
('Barolo Brunate','Giuseppe Rinaldi',2016,'Nebbiolo','Barolo, Piedmont','Italy'),
('Barolo Sperss','Gaja',2015,'Nebbiolo','Barolo, Piedmont','Italy'),
('Barbaresco','Produttori del Barbaresco',2018,'Nebbiolo','Barbaresco, Piedmont','Italy'),
('Barbaresco Asili','Bruno Giacosa',2016,'Nebbiolo','Barbaresco, Piedmont','Italy'),
('Barbera d''Alba Superiore','Vietti',2019,'Barbera','Piedmont','Italy'),
('Amarone della Valpolicella Classico','Giuseppe Quintarelli',2012,'Corvina Blend','Valpolicella, Veneto','Italy'),
('Amarone della Valpolicella','Allegrini',2016,'Corvina Blend','Valpolicella, Veneto','Italy'),
('Soave Classico La Rocca','Pieropan',2019,'Garganega','Soave, Veneto','Italy'),
('Etna Rosso','Passopisciaro',2019,'Nerello Mascalese','Etna, Sicily','Italy'),
('Etna Bianco Superiore','Benanti',2020,'Carricante','Etna, Sicily','Italy'),
('Unico','Vega Sicilia',2011,'Tempranillo Blend','Ribera del Duero','Spain'),
('Pingus','Dominio de Pingus',2016,'Tempranillo','Ribera del Duero','Spain'),
('Rioja Gran Reserva 904','La Rioja Alta',2011,'Tempranillo Blend','Rioja','Spain'),
('Viña Tondonia Reserva','R. López de Heredia',2010,'Tempranillo Blend','Rioja','Spain'),
('Rioja Reserva','Marqués de Murrieta',2017,'Tempranillo Blend','Rioja','Spain'),
('L''Ermita','Álvaro Palacios',2017,'Garnacha','Priorat','Spain'),
('Clos Mogador','Clos Mogador',2018,'Garnacha Blend','Priorat','Spain'),
('Albariño','Pazo Señorans',2021,'Albariño','Rías Baixas','Spain'),
('Fino En Rama','González Byass',NULL,'Palomino','Jerez','Spain'),
('Barca Velha','Casa Ferreirinha',2011,'Touriga Nacional Blend','Douro','Portugal'),
('Vintage Port','Taylor Fladgate',2017,'Port Blend','Douro','Portugal'),
('Vintage Port','Quinta do Noval',2016,'Port Blend','Douro','Portugal'),
('Cabernet Sauvignon','Opus One',2018,'Cabernet Sauvignon Blend','Napa Valley, California','United States'),
('Cabernet Sauvignon','Screaming Eagle',2016,'Cabernet Sauvignon','Napa Valley, California','United States'),
('Cabernet Sauvignon Estate','Ridge Monte Bello',2017,'Cabernet Sauvignon Blend','Santa Cruz Mountains, California','United States'),
('Insignia','Joseph Phelps',2018,'Cabernet Sauvignon Blend','Napa Valley, California','United States'),
('Cabernet Sauvignon','Caymus Vineyards',2019,'Cabernet Sauvignon','Napa Valley, California','United States'),
('Cabernet Sauvignon','Stag''s Leap Wine Cellars SLV',2018,'Cabernet Sauvignon','Napa Valley, California','United States'),
('Cabernet Sauvignon','Silver Oak',2017,'Cabernet Sauvignon','Alexander Valley, California','United States'),
('Zinfandel Lytton Springs','Ridge Vineyards',2019,'Zinfandel','Dry Creek Valley, California','United States'),
('Chardonnay','Kistler Vineyards',2019,'Chardonnay','Sonoma Coast, California','United States'),
('Chardonnay Hyde Vineyard','Ramey Wine Cellars',2019,'Chardonnay','Carneros, California','United States'),
('Pinot Noir Bien Nacido','Au Bon Climat',2019,'Pinot Noir','Santa Barbara, California','United States'),
('Pinot Noir Shea Vineyard','Ken Wright Cellars',2019,'Pinot Noir','Willamette Valley, Oregon','United States'),
('Pinot Noir Estate','Domaine Drouhin Oregon',2018,'Pinot Noir','Dundee Hills, Oregon','United States'),
('Riesling Eroica','Chateau Ste. Michelle',2020,'Riesling','Columbia Valley, Washington','United States'),
('Cabernet Sauvignon','Quilceda Creek',2018,'Cabernet Sauvignon','Columbia Valley, Washington','United States'),
('Grange','Penfolds',2016,'Shiraz','South Australia','Australia'),
('Bin 707 Cabernet Sauvignon','Penfolds',2018,'Cabernet Sauvignon','South Australia','Australia'),
('Hill of Grace','Henschke',2015,'Shiraz','Eden Valley','Australia'),
('The Armagh Shiraz','Jim Barry',2017,'Shiraz','Clare Valley','Australia'),
('Riesling Polish Hill','Grosset',2021,'Riesling','Clare Valley','Australia'),
('Chardonnay Art Series','Leeuwin Estate',2019,'Chardonnay','Margaret River','Australia'),
('Cabernet Sauvignon','Cullen Diana Madeline',2019,'Cabernet Sauvignon Blend','Margaret River','Australia'),
('Sauvignon Blanc','Cloudy Bay',2022,'Sauvignon Blanc','Marlborough','New Zealand'),
('Pinot Noir Block 5','Felton Road',2020,'Pinot Noir','Central Otago','New Zealand'),
('Chardonnay Kupe','Ata Rangi',2019,'Chardonnay','Martinborough','New Zealand'),
('Riesling Kabinett Wehlener Sonnenuhr','Joh. Jos. Prüm',2020,'Riesling','Mosel','Germany'),
('Riesling Spätlese Ürziger Würzgarten','Dr. Loosen',2019,'Riesling','Mosel','Germany'),
('Riesling GG Kirchenstück','Weingut Keller',2019,'Riesling','Rheinhessen','Germany'),
('Riesling GG Pechstein','Dr. Bürklin-Wolf',2019,'Riesling','Pfalz','Germany'),
('Grüner Veltliner Smaragd Achleiten','Prager',2020,'Grüner Veltliner','Wachau','Austria'),
('Riesling Smaragd Loibenberg','F.X. Pichler',2020,'Riesling','Wachau','Austria'),
('Blaufränkisch Marienthal','Weingut Moric',2018,'Blaufränkisch','Burgenland','Austria'),
('Cabernet Sauvignon Don Melchor','Concha y Toro',2018,'Cabernet Sauvignon','Puente Alto, Maipo','Chile'),
('Almaviva','Almaviva',2018,'Cabernet Sauvignon Blend','Puente Alto, Maipo','Chile'),
('Malbec Single Vineyard Adrianna','Catena Zapata',2018,'Malbec','Mendoza','Argentina'),
('Cheval des Andes','Cheval des Andes',2018,'Malbec Blend','Mendoza','Argentina'),
('Cabernet Sauvignon','Kanonkop Paul Sauer',2018,'Cabernet Sauvignon Blend','Stellenbosch','South Africa'),
('Chenin Blanc Skurfberg','Sadie Family Wines',2020,'Chenin Blanc','Swartland','South Africa'),
('Tokaji Aszú 5 Puttonyos','Royal Tokaji',2016,'Furmint','Tokaj','Hungary'),
('Assyrtiko','Domaine Sigalas',2021,'Assyrtiko','Santorini','Greece'),
('Xinomavro Grande Réserve','Boutari',2016,'Xinomavro','Naoussa','Greece');