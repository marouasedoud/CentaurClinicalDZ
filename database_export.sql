--
-- PostgreSQL database dump
--

-- Dumped from database version 16.2
-- Dumped by pg_dump version 16.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: patient_service; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_service AS ENUM (
    'general',
    'urgence',
    'oncologie',
    'cardiologie'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cardiologie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cardiologie (
    patient_id uuid NOT NULL,
    resultats_ecg character varying(255) NOT NULL,
    frequence_cardiaque_repos integer NOT NULL,
    tension_arterielle character varying(20) NOT NULL
);


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: oncologie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oncologie (
    patient_id uuid NOT NULL,
    type_tumeur character varying(150) NOT NULL,
    stade integer NOT NULL,
    traitement_en_cours character varying(255) NOT NULL,
    CONSTRAINT oncologie_stade_check CHECK (((stade >= 1) AND (stade <= 4)))
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    date_hospitalisation date NOT NULL,
    service public.patient_service NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: urgence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.urgence (
    patient_id uuid NOT NULL,
    heure_arrivee time without time zone NOT NULL,
    niveau_triage integer NOT NULL,
    gravite_initiale character varying(100) NOT NULL,
    CONSTRAINT urgence_niveau_triage_check CHECK (((niveau_triage >= 1) AND (niveau_triage <= 5)))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: cardiologie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cardiologie (patient_id, resultats_ecg, frequence_cardiaque_repos, tension_arterielle) FROM stdin;
5614e11a-4664-4754-ae98-d9484a1d5f7b	Fibrillation auriculaire	92	145/95
779b77a8-e1a6-47da-a6d4-030b2a38c78a	Rythme sinusal normal	68	118/76
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20260923000001_create_users_table.ts	1	2026-09-23 10:57:36.131+01
2	20260923000002_create_refresh_tokens_table.ts	1	2026-09-23 10:57:36.157+01
3	20260925000003_create_patients_tables.ts	2	2026-09-25 17:37:11.335+01
4	20260927000004_update_oncologie_stage_to_integer.ts	3	2026-09-27 00:00:00+01
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: oncologie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.oncologie (patient_id, type_tumeur, stade, traitement_en_cours) FROM stdin;
1d60cbfe-9764-4372-9b64-0b18594caf03	Carcinome mammaire	2	Chimiothérapie - Cycle 3
ad3d6b73-85b5-4d7d-b3cd-d18c97728652	Lymphome hodgkinien	3	Radiothérapie combinée
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patients (id, nom, prenom, date_hospitalisation, service, created_at, updated_at) FROM stdin;
a29a51cb-40df-4c9e-89a4-f67b5dec9321	Benali	Amina	2026-09-10	general	2026-09-25 17:49:41.416203+01	2026-09-25 17:49:41.416203+01
c3ca016c-0ffe-40ac-9f95-8a90312c1f07	Kaci	Youcef	2026-09-15	general	2026-09-25 17:49:41.42472+01	2026-09-25 17:49:41.42472+01
a40227df-bae1-4cf6-bb47-52352b1afb34	Hamidi	Sonia	2026-09-20	urgence	2026-09-25 17:49:41.425935+01	2026-09-25 17:49:41.425935+01
0ee16f1e-0317-4af6-a0df-f5925f672dfa	Messaoud	Rachid	2026-09-22	urgence	2026-09-25 17:49:41.426924+01	2026-09-25 17:49:41.426924+01
1d60cbfe-9764-4372-9b64-0b18594caf03	Touati	Leila	2026-08-01	oncologie	2026-09-25 17:49:41.434479+01	2026-09-25 17:49:41.434479+01
ad3d6b73-85b5-4d7d-b3cd-d18c97728652	Aissaoui	Karim	2026-08-15	oncologie	2026-09-25 17:49:41.435531+01	2026-09-25 17:49:41.435531+01
5614e11a-4664-4754-ae98-d9484a1d5f7b	Zerrouk	Omar	2026-09-05	cardiologie	2026-09-25 17:49:41.438028+01	2026-09-25 17:49:41.438028+01
779b77a8-e1a6-47da-a6d4-030b2a38c78a	Boudiaf	Fatima	2026-09-18	cardiologie	2026-09-25 17:49:41.438993+01	2026-09-25 17:49:41.438993+01
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
b89ef36a-c066-40c6-8b21-71fc7d8faa2a	be860ac3-d089-4bd2-a6dd-55482e242a01	b19a6389aff01d8d6a492b161668931b13ba2a8c84e7d2cdb0868fa31c9e89be	2026-09-30 12:27:18.86+01	f	2026-09-23 12:27:18.86323+01
f5ddd120-fc7c-4707-8fcb-ff5a05dfef5b	be860ac3-d089-4bd2-a6dd-55482e242a01	e182571b7c7deb084794637fa6093d66de0a32088773fac314754622b9192ca0	2026-09-30 12:38:27.015+01	t	2026-09-23 12:38:27.017577+01
4d33d5cc-79b8-4eff-982a-19894bf0e218	be860ac3-d089-4bd2-a6dd-55482e242a01	e10b17ec6413afbb2b05e5e2872f7535b98431b52470e717f855caf2b20baf71	2026-09-30 13:40:01.964+01	f	2026-09-23 13:40:01.965175+01
191b447d-e674-47ce-b876-4b60946fb1c5	be860ac3-d089-4bd2-a6dd-55482e242a01	8105507c7028cf7c4407c74badf0b4591afffcf3bf7e5250a1704fe084454eab	2026-10-02 16:17:23.468+01	t	2026-09-25 16:17:23.473311+01
a35432f6-31b5-4250-86dc-17376baa3248	be860ac3-d089-4bd2-a6dd-55482e242a01	8b70e65b58261bc3f8876e4e6a8464aa04535d7dbae335fb105a40342091b27a	2026-10-02 18:05:39.11+01	f	2026-09-25 18:05:39.112468+01
63e36c0e-649d-4ce9-8d46-89a597948f70	be860ac3-d089-4bd2-a6dd-55482e242a01	722c0525128bf93b3b0a200072dd391f7992f8903845202eb059c18af41230cc	2026-10-02 18:37:47.927+01	t	2026-09-25 18:37:47.92802+01
fb0eb9b3-8c31-4ecc-ba8a-ef97589487fa	be860ac3-d089-4bd2-a6dd-55482e242a01	7631ba6d518a778209c33df9b815e220547ce744936565d11f3ad2298ba55090	2026-10-02 19:01:19.271+01	f	2026-09-25 19:01:19.271993+01
4b223295-bd82-433f-bdfd-c130b344cd7f	be860ac3-d089-4bd2-a6dd-55482e242a01	aff0311f79032126e47ea8ac3eef52d8d598f20febc18853f4bec0b519f5489b	2026-10-02 19:15:26.287+01	t	2026-09-25 19:15:26.288497+01
ace80c43-4c4e-46d3-bbcc-2a8819972b86	be860ac3-d089-4bd2-a6dd-55482e242a01	0744c7db7d694f1e26f90ad74fe24893c13e52cfd189d9df1ee93a2b0dfb6a37	2026-10-02 19:54:27.816+01	t	2026-09-25 19:54:27.818645+01
f053cb3d-da54-4e19-a0aa-eb167a0dc13b	be860ac3-d089-4bd2-a6dd-55482e242a01	64588abe08de6a5175885a19a71da444d61eb475b2ae6bf032034dcc24dc169d	2026-10-02 20:37:02.101+01	t	2026-09-25 20:37:02.103737+01
acf172b6-0fbc-4660-81b1-b53f525b78a7	be860ac3-d089-4bd2-a6dd-55482e242a01	e0b516546596b35b4e11cd6a279b7c99021adcdb0de6716113ab49fd3b12f41d	2026-10-02 20:37:11.17+01	t	2026-09-25 20:37:11.172835+01
3d53c6fe-e058-439a-80f0-7475d7ef1008	be860ac3-d089-4bd2-a6dd-55482e242a01	6162cfbb46e9cca0293f6da620194890e755e7d06bb173c4d499ec4267bebd30	2026-10-02 20:39:13.296+01	t	2026-09-25 20:39:13.298182+01
a067b801-17c4-4616-ab36-8726795f30e9	be860ac3-d089-4bd2-a6dd-55482e242a01	e154fd27fe53cd5c8d93a59ef51b7e15caf02aaa3dc515631ea238a80e14c5b4	2026-10-02 20:40:10.98+01	f	2026-09-25 20:40:10.984774+01
\.


--
-- Data for Name: urgence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.urgence (patient_id, heure_arrivee, niveau_triage, gravite_initiale) FROM stdin;
a40227df-bae1-4cf6-bb47-52352b1afb34	08:45:00	2	Douleur thoracique aiguë
0ee16f1e-0317-4af6-a0df-f5925f672dfa	14:30:00	4	Lacération mineure au bras
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, created_at, updated_at) FROM stdin;
be860ac3-d089-4bd2-a6dd-55482e242a01	maroua	$2a$10$LyRrvWguWuOMU9VG7M9xAetTwY25RXLloXI8zHiDbdLkmh7LzZtGm	2026-09-23 12:27:18.842334+01	2026-09-23 12:27:18.842334+01
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 3, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: cardiologie cardiologie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cardiologie
    ADD CONSTRAINT cardiologie_pkey PRIMARY KEY (patient_id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: oncologie oncologie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oncologie
    ADD CONSTRAINT oncologie_pkey PRIMARY KEY (patient_id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash);


--
-- Name: urgence urgence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.urgence
    ADD CONSTRAINT urgence_pkey PRIMARY KEY (patient_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: patients_service_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patients_service_index ON public.patients USING btree (service);


--
-- Name: refresh_tokens_revoked_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_revoked_index ON public.refresh_tokens USING btree (revoked);


--
-- Name: refresh_tokens_token_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_token_hash_index ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_id_index ON public.refresh_tokens USING btree (user_id);


--
-- Name: users_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_username_index ON public.users USING btree (username);


--
-- Name: cardiologie cardiologie_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cardiologie
    ADD CONSTRAINT cardiologie_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: oncologie oncologie_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oncologie
    ADD CONSTRAINT oncologie_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: urgence urgence_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.urgence
    ADD CONSTRAINT urgence_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

