# Changelog

## [3.1.1](https://github.com/JustinBeckwith/gcx/compare/gcx-v3.1.0...gcx-v3.1.1) (2026-02-25)


### Bug Fixes

* **deps:** update dependency globby to v16 ([#340](https://github.com/JustinBeckwith/gcx/issues/340)) ([424c571](https://github.com/JustinBeckwith/gcx/commit/424c5718b705b5047cfef820c84462f1b3c1b0da))

## [3.1.0](https://github.com/JustinBeckwith/gcx/compare/gcx-v3.0.0...gcx-v3.1.0) (2025-10-28)


### Features

* add --allow-unauthenticated flag for public functions ([#337](https://github.com/JustinBeckwith/gcx/issues/337)) ([fb80b1b](https://github.com/JustinBeckwith/gcx/commit/fb80b1b4b54f59ba9d1b4569dce90a5a95b52a4a))


### Bug Fixes

* **deps:** update dependency googleapis to v164 ([#332](https://github.com/JustinBeckwith/gcx/issues/332)) ([f104729](https://github.com/JustinBeckwith/gcx/commit/f104729d3e2b7098f0264639be4b6e59641ee5bf))

## [3.0.0](https://github.com/JustinBeckwith/gcx/compare/v2.0.27...main) (2025-10-15)


### ⚠ BREAKING CHANGES

* this requires nodejs 20 and up nao
* require node 16 and up ([#218](https://github.com/JustinBeckwith/gcx/issues/218))
* This library now requires node.js 12 and up, and has been converted to ESM. Enjoy :)
* Drops support for node.js 8

### Features

* Add `data` option to `gcx.call`. Fixes [#27](https://github.com/JustinBeckwith/gcx/issues/27) ([#26](https://github.com/JustinBeckwith/gcx/issues/26)) ([aa03e3c](https://github.com/JustinBeckwith/gcx/commit/aa03e3cb090f2b38352a21bcafc63db85542c165))
* add a `call` method to the API ([#15](https://github.com/JustinBeckwith/gcx/issues/15)) ([3ffc017](https://github.com/JustinBeckwith/gcx/commit/3ffc01798cd8611afa5137f52478eff84e5dc406))
* add output during deployment in cli ([e09eaf4](https://github.com/JustinBeckwith/gcx/commit/e09eaf4fd168a9ef6beb70627880d758c29baef4))
* add vpc connector field ([#70](https://github.com/JustinBeckwith/gcx/issues/70)) ([6438f62](https://github.com/JustinBeckwith/gcx/commit/6438f62c573968cb7d10585eb1194cbea2c9c494))
* complete function create ([94423c5](https://github.com/JustinBeckwith/gcx/commit/94423c5dfb6b5ce2c5d4d7bf2c677b978c13c515))
* enable signed uploads to GCS ([c9438ac](https://github.com/JustinBeckwith/gcx/commit/c9438acbe9a94fcf9c181d1fe128987257c36612))
* generate a .gcloudignore if not present ([56f2aee](https://github.com/JustinBeckwith/gcx/commit/56f2aee51e0d09a8f455f7a3ba63cdbbb78e0e90))
* poll the operation and wait for completion ([7730251](https://github.com/JustinBeckwith/gcx/commit/7730251fb0e0fc896c0d8e55031a12b932140924))


### Bug Fixes

* accept `project` as well as `projectId` ([7e5cb99](https://github.com/JustinBeckwith/gcx/commit/7e5cb994634132552e0dc9405d814674435f9c99))
* accept name as a positional argument ([eb5e6b5](https://github.com/JustinBeckwith/gcx/commit/eb5e6b5d927a182496637aa9e2f5cc55147e02b8))
* **deps:** downgrade node-fetch to 3.1.0 to address type errors ([#199](https://github.com/JustinBeckwith/gcx/issues/199)) ([78a28cf](https://github.com/JustinBeckwith/gcx/commit/78a28cfe090019e620b074a9313ee861d6b23694))
* **deps:** downgrade to fetch 2.x ([#201](https://github.com/JustinBeckwith/gcx/issues/201)) ([c172235](https://github.com/JustinBeckwith/gcx/commit/c1722355678314d815d73b5069f7f559ffdfd52a))
* **deps:** update dependency archiver to v4 ([#81](https://github.com/JustinBeckwith/gcx/issues/81)) ([68c7d94](https://github.com/JustinBeckwith/gcx/commit/68c7d943b8d5b05027d89145be38ae1e46e5b5cf))
* **deps:** update dependency archiver to v5 ([#95](https://github.com/JustinBeckwith/gcx/issues/95)) ([5d71afa](https://github.com/JustinBeckwith/gcx/commit/5d71afaddd5208348cd1716afcf584a578ecef00))
* **deps:** update dependency archiver to v6 ([#233](https://github.com/JustinBeckwith/gcx/issues/233)) ([79dfcd5](https://github.com/JustinBeckwith/gcx/commit/79dfcd5606c5dae677d6f034e0af47d0f7f2cb6d))
* **deps:** update dependency archiver to v7 ([#262](https://github.com/JustinBeckwith/gcx/issues/262)) ([7eece63](https://github.com/JustinBeckwith/gcx/commit/7eece63b3205de42a06f67a16e313aa0e57420b4))
* **deps:** update dependency gaxios to v5 ([#177](https://github.com/JustinBeckwith/gcx/issues/177)) ([8058f13](https://github.com/JustinBeckwith/gcx/commit/8058f136ad3ff06d7f0cd20e98244a5e7e743e9e))
* **deps:** update dependency globby to v10 ([#43](https://github.com/JustinBeckwith/gcx/issues/43)) ([327ff55](https://github.com/JustinBeckwith/gcx/commit/327ff55a46055b9639f0c8998eebf97aa868bfd1))
* **deps:** update dependency globby to v11 ([#64](https://github.com/JustinBeckwith/gcx/issues/64)) ([c7f0cef](https://github.com/JustinBeckwith/gcx/commit/c7f0cef224fc1d8469ada808baf29d50a4a997fe))
* **deps:** update dependency globby to v14 ([#249](https://github.com/JustinBeckwith/gcx/issues/249)) ([cc94f51](https://github.com/JustinBeckwith/gcx/commit/cc94f513104c1db223a1310332a87ac6c9d2ca88))
* **deps:** update dependency globby to v15 ([#317](https://github.com/JustinBeckwith/gcx/issues/317)) ([4a3d566](https://github.com/JustinBeckwith/gcx/commit/4a3d5660cc21a90cc888053e17e3020272fc6334))
* **deps:** update dependency globby to v9 ([#5](https://github.com/JustinBeckwith/gcx/issues/5)) ([efad0c0](https://github.com/JustinBeckwith/gcx/commit/efad0c094daa0d5eb9621de28a9ea38313f4a102))
* **deps:** update dependency google-auth-library to v3 ([#7](https://github.com/JustinBeckwith/gcx/issues/7)) ([21f7c94](https://github.com/JustinBeckwith/gcx/commit/21f7c949c9224f43ff43d289e263ad19ea5715b8))
* **deps:** update dependency googleapis to v100 ([#175](https://github.com/JustinBeckwith/gcx/issues/175)) ([7e0e340](https://github.com/JustinBeckwith/gcx/commit/7e0e3400a4434b1fc9f65b72eafbad49aa0af53f))
* **deps:** update dependency googleapis to v101 ([#181](https://github.com/JustinBeckwith/gcx/issues/181)) ([edbcbb6](https://github.com/JustinBeckwith/gcx/commit/edbcbb65adf7c0751ac2b9b492160330c29e93be))
* **deps:** update dependency googleapis to v102 ([#182](https://github.com/JustinBeckwith/gcx/issues/182)) ([d57d7bf](https://github.com/JustinBeckwith/gcx/commit/d57d7bf73ceb54e75a5b11db4c6da153f5b0bdcb))
* **deps:** update dependency googleapis to v103 ([#183](https://github.com/JustinBeckwith/gcx/issues/183)) ([5a489b5](https://github.com/JustinBeckwith/gcx/commit/5a489b5be4b797d3ae1cc547d4be0b5891116fbc))
* **deps:** update dependency googleapis to v104 ([#184](https://github.com/JustinBeckwith/gcx/issues/184)) ([ca6ec2f](https://github.com/JustinBeckwith/gcx/commit/ca6ec2f7419780f91cb49af35f66145817c7c7b9))
* **deps:** update dependency googleapis to v105 ([#187](https://github.com/JustinBeckwith/gcx/issues/187)) ([939b9e4](https://github.com/JustinBeckwith/gcx/commit/939b9e46125fecc83d60bdf14abe9334aec9f36d))
* **deps:** update dependency googleapis to v109 ([#195](https://github.com/JustinBeckwith/gcx/issues/195)) ([374c877](https://github.com/JustinBeckwith/gcx/commit/374c8771893e53ca46ce784ccf80bac4d06d533b))
* **deps:** update dependency googleapis to v110 ([#203](https://github.com/JustinBeckwith/gcx/issues/203)) ([8fb686d](https://github.com/JustinBeckwith/gcx/commit/8fb686d21af78dc1407fa5bcdaccfd221ef23edd))
* **deps:** update dependency googleapis to v111 ([#207](https://github.com/JustinBeckwith/gcx/issues/207)) ([639eb13](https://github.com/JustinBeckwith/gcx/commit/639eb13b96650b3308fa3ea4699d371149548a63))
* **deps:** update dependency googleapis to v113 ([#209](https://github.com/JustinBeckwith/gcx/issues/209)) ([c256743](https://github.com/JustinBeckwith/gcx/commit/c256743611941b9399ed1640eae2811b4c822752))
* **deps:** update dependency googleapis to v114 ([#211](https://github.com/JustinBeckwith/gcx/issues/211)) ([d1dc919](https://github.com/JustinBeckwith/gcx/commit/d1dc91982afe0a3136df7d52cb90ef972b46b313))
* **deps:** update dependency googleapis to v117 ([#217](https://github.com/JustinBeckwith/gcx/issues/217)) ([59c7158](https://github.com/JustinBeckwith/gcx/commit/59c715898f3ce8db875a4b9f6d95baa9d62b8b20))
* **deps:** update dependency googleapis to v118 ([#219](https://github.com/JustinBeckwith/gcx/issues/219)) ([6ff920c](https://github.com/JustinBeckwith/gcx/commit/6ff920c5a62f342b526637145b752a9956f037aa))
* **deps:** update dependency googleapis to v123 ([#227](https://github.com/JustinBeckwith/gcx/issues/227)) ([5c4ed9e](https://github.com/JustinBeckwith/gcx/commit/5c4ed9eedee1f7c4a9ff03cc8f476152359a8642))
* **deps:** update dependency googleapis to v126 ([#232](https://github.com/JustinBeckwith/gcx/issues/232)) ([d0d9b94](https://github.com/JustinBeckwith/gcx/commit/d0d9b94f2f13dcf9614c4092095e03605e66379d))
* **deps:** update dependency googleapis to v128 ([#241](https://github.com/JustinBeckwith/gcx/issues/241)) ([72e28ee](https://github.com/JustinBeckwith/gcx/commit/72e28ee8ff63b8ae14940452b5fd042f557d0c9b))
* **deps:** update dependency googleapis to v129 ([#251](https://github.com/JustinBeckwith/gcx/issues/251)) ([b97ac22](https://github.com/JustinBeckwith/gcx/commit/b97ac228eb989af54c2ee790d3840d4a3e7af30c))
* **deps:** update dependency googleapis to v130 ([#255](https://github.com/JustinBeckwith/gcx/issues/255)) ([7c1451b](https://github.com/JustinBeckwith/gcx/commit/7c1451bb601484697adc25450dbb8c5b8f435439))
* **deps:** update dependency googleapis to v131 ([#257](https://github.com/JustinBeckwith/gcx/issues/257)) ([fe43cc8](https://github.com/JustinBeckwith/gcx/commit/fe43cc85ebd05a10ac03b47b82868564463cd594))
* **deps:** update dependency googleapis to v132 ([#259](https://github.com/JustinBeckwith/gcx/issues/259)) ([c5d3495](https://github.com/JustinBeckwith/gcx/commit/c5d349590cc508ab3f10b424994095a651baac2e))
* **deps:** update dependency googleapis to v133 ([#261](https://github.com/JustinBeckwith/gcx/issues/261)) ([2c50fad](https://github.com/JustinBeckwith/gcx/commit/2c50fadb4a37a7ac2305b860f574d4713e872288))
* **deps:** update dependency googleapis to v134 ([#265](https://github.com/JustinBeckwith/gcx/issues/265)) ([2ea49aa](https://github.com/JustinBeckwith/gcx/commit/2ea49aa7ef394abd5805362b16f3da205a74e301))
* **deps:** update dependency googleapis to v137 ([#267](https://github.com/JustinBeckwith/gcx/issues/267)) ([baadd8c](https://github.com/JustinBeckwith/gcx/commit/baadd8cd95f296a2fd1e3bc5bf8ba3ada03366cd))
* **deps:** update dependency googleapis to v139 ([#270](https://github.com/JustinBeckwith/gcx/issues/270)) ([fae2148](https://github.com/JustinBeckwith/gcx/commit/fae2148d528757e69d51f9e84c42aab89a0833f5))
* **deps:** update dependency googleapis to v140 ([#271](https://github.com/JustinBeckwith/gcx/issues/271)) ([4571905](https://github.com/JustinBeckwith/gcx/commit/45719055068d00673cb33ff751d1884a4dd9ba2b))
* **deps:** update dependency googleapis to v142 ([#278](https://github.com/JustinBeckwith/gcx/issues/278)) ([0df4448](https://github.com/JustinBeckwith/gcx/commit/0df44483619b8494518fd8e08d02de06890b8eec))
* **deps:** update dependency googleapis to v143 ([#279](https://github.com/JustinBeckwith/gcx/issues/279)) ([5596354](https://github.com/JustinBeckwith/gcx/commit/5596354bb6d0997f110b829c12c5bee7677a0445))
* **deps:** update dependency googleapis to v144 ([#280](https://github.com/JustinBeckwith/gcx/issues/280)) ([4db8d6c](https://github.com/JustinBeckwith/gcx/commit/4db8d6cc5a823f7189433317a7ca40e7c8f9249a))
* **deps:** update dependency googleapis to v36 ([#3](https://github.com/JustinBeckwith/gcx/issues/3)) ([0c0d294](https://github.com/JustinBeckwith/gcx/commit/0c0d2941839dd268ec78426297b05027c580d2ce))
* **deps:** update dependency googleapis to v37 ([#8](https://github.com/JustinBeckwith/gcx/issues/8)) ([1dc5bb5](https://github.com/JustinBeckwith/gcx/commit/1dc5bb5507fa763a60204f60fe10dd3136a7c80e))
* **deps:** update dependency googleapis to v38 ([#24](https://github.com/JustinBeckwith/gcx/issues/24)) ([b7d27b3](https://github.com/JustinBeckwith/gcx/commit/b7d27b364cdf2cd07eb5ccea5897b351b52c4455))
* **deps:** update dependency googleapis to v39 ([#25](https://github.com/JustinBeckwith/gcx/issues/25)) ([77f779e](https://github.com/JustinBeckwith/gcx/commit/77f779e4476983e495f9211b118cefb1a9789eb2))
* **deps:** update dependency googleapis to v40 ([#36](https://github.com/JustinBeckwith/gcx/issues/36)) ([e2b82bb](https://github.com/JustinBeckwith/gcx/commit/e2b82bb7098928aab1f0c1034a2aa2a53ba14186))
* **deps:** update dependency googleapis to v42 ([#45](https://github.com/JustinBeckwith/gcx/issues/45)) ([15112c3](https://github.com/JustinBeckwith/gcx/commit/15112c3f97bcfd79eae011b15f794f803eca27ad))
* **deps:** update dependency googleapis to v43 ([#49](https://github.com/JustinBeckwith/gcx/issues/49)) ([a8b1965](https://github.com/JustinBeckwith/gcx/commit/a8b19657854a7a5223b12a62d57ef7c3c7210147))
* **deps:** update dependency googleapis to v44 ([#51](https://github.com/JustinBeckwith/gcx/issues/51)) ([20b3308](https://github.com/JustinBeckwith/gcx/commit/20b3308d151ad5000c6e9b2350935b0e6b0ad90d))
* **deps:** update dependency googleapis to v45 ([#54](https://github.com/JustinBeckwith/gcx/issues/54)) ([70fbf7a](https://github.com/JustinBeckwith/gcx/commit/70fbf7a96704d1fa0f15ce238d5a7004a4b16ad7))
* **deps:** update dependency googleapis to v46 ([#60](https://github.com/JustinBeckwith/gcx/issues/60)) ([1b4325c](https://github.com/JustinBeckwith/gcx/commit/1b4325cdaa8d957a3a295c6f0a6e74e96cdda751))
* **deps:** update dependency googleapis to v47 ([#67](https://github.com/JustinBeckwith/gcx/issues/67)) ([fe40413](https://github.com/JustinBeckwith/gcx/commit/fe4041330cec3b756d63c9858cbf6fdd783eb76e))
* **deps:** update dependency googleapis to v48 ([#78](https://github.com/JustinBeckwith/gcx/issues/78)) ([693b418](https://github.com/JustinBeckwith/gcx/commit/693b41828a1c084a5a52e28931f11f6b9e558d39))
* **deps:** update dependency googleapis to v49 ([#82](https://github.com/JustinBeckwith/gcx/issues/82)) ([325f042](https://github.com/JustinBeckwith/gcx/commit/325f042401bec776c94f55c42dcc53b126dcfcdd))
* **deps:** update dependency googleapis to v50 ([#84](https://github.com/JustinBeckwith/gcx/issues/84)) ([2a408c2](https://github.com/JustinBeckwith/gcx/commit/2a408c21eb987c75f802dd719fbc2a854cac9281))
* **deps:** update dependency googleapis to v51 ([#87](https://github.com/JustinBeckwith/gcx/issues/87)) ([29886d6](https://github.com/JustinBeckwith/gcx/commit/29886d67e6ffff9c970d8b1132cf7b971efb23ba))
* **deps:** update dependency googleapis to v52 ([#89](https://github.com/JustinBeckwith/gcx/issues/89)) ([5876605](https://github.com/JustinBeckwith/gcx/commit/5876605548c41b8e730af98af9bcab149e7089d4))
* **deps:** update dependency googleapis to v54 ([#93](https://github.com/JustinBeckwith/gcx/issues/93)) ([53fb61b](https://github.com/JustinBeckwith/gcx/commit/53fb61bfa760152ff7dad5afb638e51780287566))
* **deps:** update dependency googleapis to v55 ([#94](https://github.com/JustinBeckwith/gcx/issues/94)) ([a080a26](https://github.com/JustinBeckwith/gcx/commit/a080a26eb0f465f5db601d6ce421315ea72f1cd1))
* **deps:** update dependency googleapis to v56 ([#96](https://github.com/JustinBeckwith/gcx/issues/96)) ([0cedf9c](https://github.com/JustinBeckwith/gcx/commit/0cedf9cbf4d25b09aff6720a38861d797693eccc))
* **deps:** update dependency googleapis to v57 ([#97](https://github.com/JustinBeckwith/gcx/issues/97)) ([cc0114c](https://github.com/JustinBeckwith/gcx/commit/cc0114c17584bbc1b9008d1e7048bbb5650eba70))
* **deps:** update dependency googleapis to v58 ([#98](https://github.com/JustinBeckwith/gcx/issues/98)) ([7fad795](https://github.com/JustinBeckwith/gcx/commit/7fad7954f4ade90a45458ebebf382cf01d78635d))
* **deps:** update dependency googleapis to v59 ([#100](https://github.com/JustinBeckwith/gcx/issues/100)) ([4c4713b](https://github.com/JustinBeckwith/gcx/commit/4c4713b3efdb254e00d2216bfd4efa2342a5b926))
* **deps:** update dependency googleapis to v60 ([#105](https://github.com/JustinBeckwith/gcx/issues/105)) ([bbb2196](https://github.com/JustinBeckwith/gcx/commit/bbb219650e5a36dbcf4ed6f7e4d0bc6a74b627c4))
* **deps:** update dependency googleapis to v61 ([#108](https://github.com/JustinBeckwith/gcx/issues/108)) ([ed89158](https://github.com/JustinBeckwith/gcx/commit/ed891583ab3898b2f855cb8bb5d910eb64179c46))
* **deps:** update dependency googleapis to v62 ([#110](https://github.com/JustinBeckwith/gcx/issues/110)) ([45004ea](https://github.com/JustinBeckwith/gcx/commit/45004eab976e6301eb796589734305bd2ce3b3e7))
* **deps:** update dependency googleapis to v63 ([#112](https://github.com/JustinBeckwith/gcx/issues/112)) ([7a8632e](https://github.com/JustinBeckwith/gcx/commit/7a8632e3a76106d601e5978ab1c6624b4e3fdbe8))
* **deps:** update dependency googleapis to v64 ([#113](https://github.com/JustinBeckwith/gcx/issues/113)) ([4c8df95](https://github.com/JustinBeckwith/gcx/commit/4c8df959a6ff70a1bf3a22442e659c083ca97d3c))
* **deps:** update dependency googleapis to v65 ([#114](https://github.com/JustinBeckwith/gcx/issues/114)) ([34ab277](https://github.com/JustinBeckwith/gcx/commit/34ab2773c6ecd0e1fb76af1fe356ce79e73966a3))
* **deps:** update dependency googleapis to v66 ([#117](https://github.com/JustinBeckwith/gcx/issues/117)) ([f9935fd](https://github.com/JustinBeckwith/gcx/commit/f9935fd334f93b4b4a7ab2cc053a13d4e82777dd))
* **deps:** update dependency googleapis to v72 ([#127](https://github.com/JustinBeckwith/gcx/issues/127)) ([4560c76](https://github.com/JustinBeckwith/gcx/commit/4560c76e10cdf9532b0dedad80aaf57dcad38f5d))
* **deps:** update dependency googleapis to v75 ([#134](https://github.com/JustinBeckwith/gcx/issues/134)) ([fcedafc](https://github.com/JustinBeckwith/gcx/commit/fcedafcbdf7e2557968ebf620d83035a15cc4523))
* **deps:** update dependency googleapis to v76 ([#137](https://github.com/JustinBeckwith/gcx/issues/137)) ([cba7ef6](https://github.com/JustinBeckwith/gcx/commit/cba7ef64308ebb8761c69d1625ab852deb3ee35b))
* **deps:** update dependency googleapis to v77 ([#138](https://github.com/JustinBeckwith/gcx/issues/138)) ([7831de5](https://github.com/JustinBeckwith/gcx/commit/7831de5cb7af6e306a3d97ad02cf3b7b2c256e94))
* **deps:** update dependency googleapis to v78 ([#139](https://github.com/JustinBeckwith/gcx/issues/139)) ([1145c47](https://github.com/JustinBeckwith/gcx/commit/1145c47a49db4b4a23f622dee646a94cb717a332))
* **deps:** update dependency googleapis to v79 ([#140](https://github.com/JustinBeckwith/gcx/issues/140)) ([b5231ad](https://github.com/JustinBeckwith/gcx/commit/b5231ad14d3aa29f296ae566fdb99662688d0901))
* **deps:** update dependency googleapis to v81 ([#142](https://github.com/JustinBeckwith/gcx/issues/142)) ([207e3d1](https://github.com/JustinBeckwith/gcx/commit/207e3d1b4b2591e018f3e7fd795bcac5a51da6af))
* **deps:** update dependency googleapis to v82 ([#143](https://github.com/JustinBeckwith/gcx/issues/143)) ([a09be35](https://github.com/JustinBeckwith/gcx/commit/a09be3545b2d506d9d0dc789075963bdd780b2e4))
* **deps:** update dependency googleapis to v84 ([#147](https://github.com/JustinBeckwith/gcx/issues/147)) ([641da68](https://github.com/JustinBeckwith/gcx/commit/641da68ae36124106fe91c583a3c8451adde31e8))
* **deps:** update dependency googleapis to v85 ([#152](https://github.com/JustinBeckwith/gcx/issues/152)) ([e33d8f6](https://github.com/JustinBeckwith/gcx/commit/e33d8f6b5429dbc0aa4dc40958d073e5e4d245aa))
* **deps:** update dependency googleapis to v89 ([#157](https://github.com/JustinBeckwith/gcx/issues/157)) ([982b467](https://github.com/JustinBeckwith/gcx/commit/982b467cb4293b5914f4035e71c0d7562c97cd62))
* **deps:** update dependency googleapis to v91 ([#160](https://github.com/JustinBeckwith/gcx/issues/160)) ([02ca397](https://github.com/JustinBeckwith/gcx/commit/02ca3977978a392daf5580c925dd2a00cef2708b))
* **deps:** update dependency googleapis to v92 ([#162](https://github.com/JustinBeckwith/gcx/issues/162)) ([ab710d0](https://github.com/JustinBeckwith/gcx/commit/ab710d032ca018a15c9fbaf992a1f87f4b21aa93))
* **deps:** update dependency googleapis to v95 ([#169](https://github.com/JustinBeckwith/gcx/issues/169)) ([9704e8d](https://github.com/JustinBeckwith/gcx/commit/9704e8dadf3b9bbe03ae89283fab5b0c403a2927))
* **deps:** update dependency googleapis to v96 ([#170](https://github.com/JustinBeckwith/gcx/issues/170)) ([f8309fd](https://github.com/JustinBeckwith/gcx/commit/f8309fd0648a3f01936543c72e712fc61f2c5ad9))
* **deps:** update dependency googleapis to v97 ([#171](https://github.com/JustinBeckwith/gcx/issues/171)) ([96cf60c](https://github.com/JustinBeckwith/gcx/commit/96cf60cecf789ce906d08350b2660451f8de9115))
* **deps:** update dependency googleapis to v98 ([#172](https://github.com/JustinBeckwith/gcx/issues/172)) ([80f9e1d](https://github.com/JustinBeckwith/gcx/commit/80f9e1dc6f9342157195e88fc1e18d73e63754ef))
* **deps:** update dependency googleapis to v99 ([#173](https://github.com/JustinBeckwith/gcx/issues/173)) ([4995310](https://github.com/JustinBeckwith/gcx/commit/4995310cd325d54cdcabda50101d2aaf7b2fc081))
* **deps:** update dependency gts to v1 ([#30](https://github.com/JustinBeckwith/gcx/issues/30)) ([d4bb290](https://github.com/JustinBeckwith/gcx/commit/d4bb290d943e9836fae763f3032a222868f0c8dd))
* **deps:** update dependency meow to v11 ([#196](https://github.com/JustinBeckwith/gcx/issues/196)) ([276c14a](https://github.com/JustinBeckwith/gcx/commit/276c14aae26eff7ae62b30ea1399cef29092f7ce))
* **deps:** update dependency meow to v12 ([#220](https://github.com/JustinBeckwith/gcx/issues/220)) ([7cc3a52](https://github.com/JustinBeckwith/gcx/commit/7cc3a52e7e9407d7eca4f72b73fe8d2035181057))
* **deps:** update dependency meow to v13 ([#252](https://github.com/JustinBeckwith/gcx/issues/252)) ([8151c46](https://github.com/JustinBeckwith/gcx/commit/8151c46e4d975572e5de852cc2db612a319cb67f))
* **deps:** update dependency meow to v14 ([#313](https://github.com/JustinBeckwith/gcx/issues/313)) ([85bf1a3](https://github.com/JustinBeckwith/gcx/commit/85bf1a31c1255569d83d263432db567c3623cf4d))
* **deps:** update dependency meow to v7 ([#85](https://github.com/JustinBeckwith/gcx/issues/85)) ([2592a18](https://github.com/JustinBeckwith/gcx/commit/2592a18daf2efa79e5c7ee6e1349a8c11475b0f6))
* **deps:** update dependency meow to v8 ([#111](https://github.com/JustinBeckwith/gcx/issues/111)) ([e770c7f](https://github.com/JustinBeckwith/gcx/commit/e770c7f43fd3b40386f914c38a4f471531de5ee9))
* **deps:** update dependency ora to v4 ([#50](https://github.com/JustinBeckwith/gcx/issues/50)) ([02a3c2a](https://github.com/JustinBeckwith/gcx/commit/02a3c2a1d533a01d4f16cf5fe35457b84e22f381))
* **deps:** update dependency ora to v5 ([#99](https://github.com/JustinBeckwith/gcx/issues/99)) ([1438446](https://github.com/JustinBeckwith/gcx/commit/1438446f6520138afa4a36d8c603b7a3de1f143c))
* **deps:** update dependency ora to v7 ([#229](https://github.com/JustinBeckwith/gcx/issues/229)) ([0b738df](https://github.com/JustinBeckwith/gcx/commit/0b738df379c0cc58fea0f6c5be3e303ef4d13248))
* **deps:** update dependency ora to v8 ([#253](https://github.com/JustinBeckwith/gcx/issues/253)) ([1d4e6ff](https://github.com/JustinBeckwith/gcx/commit/1d4e6ff4a6e6631faae426bddceac44de9fa6e0a))
* **deps:** update dependency ora to v9 ([#314](https://github.com/JustinBeckwith/gcx/issues/314)) ([c137577](https://github.com/JustinBeckwith/gcx/commit/c1375775d36f225c7ebf1287d357aa5545fd678b))
* **deps:** update dependency update-notifier to v3 ([#34](https://github.com/JustinBeckwith/gcx/issues/34)) ([988d226](https://github.com/JustinBeckwith/gcx/commit/988d226e66b961a42357ce986797ba4b68565da2))
* **deps:** update dependency update-notifier to v4 ([#61](https://github.com/JustinBeckwith/gcx/issues/61)) ([2d871fe](https://github.com/JustinBeckwith/gcx/commit/2d871fef0751b1f0d45153b23ccd36afe9e637f2))
* **deps:** update dependency update-notifier to v5 ([#106](https://github.com/JustinBeckwith/gcx/issues/106)) ([28c5886](https://github.com/JustinBeckwith/gcx/commit/28c58867d9ab12964910ea765845fca3a9715d04))
* **deps:** update dependency update-notifier to v6 ([#185](https://github.com/JustinBeckwith/gcx/issues/185)) ([ece37b6](https://github.com/JustinBeckwith/gcx/commit/ece37b65e04800c5c02fed44bf303bb0ba926764))
* **deps:** update dependency update-notifier to v7 ([#246](https://github.com/JustinBeckwith/gcx/issues/246)) ([4927537](https://github.com/JustinBeckwith/gcx/commit/4927537bb98a3471e5178a96bbb48773ce588cf7))
* **deps:** update dependency uuid to v10 ([#272](https://github.com/JustinBeckwith/gcx/issues/272)) ([83b677d](https://github.com/JustinBeckwith/gcx/commit/83b677d95aeba82ffb0573498949c9b6cec05d07))
* **deps:** update dependency uuid to v11 ([#283](https://github.com/JustinBeckwith/gcx/issues/283)) ([949c4bd](https://github.com/JustinBeckwith/gcx/commit/949c4bd47129418f174908ae318af13dceccb138))
* **deps:** update dependency uuid to v13 ([#309](https://github.com/JustinBeckwith/gcx/issues/309)) ([e7d755d](https://github.com/JustinBeckwith/gcx/commit/e7d755dc9fa29bfd9051383d227d7510e01b2377))
* **deps:** update dependency uuid to v7 ([#76](https://github.com/JustinBeckwith/gcx/issues/76)) ([c4e7c08](https://github.com/JustinBeckwith/gcx/commit/c4e7c081178ee4d9888811f18b64c2635a649005))
* **deps:** update dependency uuid to v8 ([#83](https://github.com/JustinBeckwith/gcx/issues/83)) ([9ae9651](https://github.com/JustinBeckwith/gcx/commit/9ae9651d932256b0d668fe3f0f1525ab40a9ba70))
* **deps:** update dependency uuid to v9 ([#192](https://github.com/JustinBeckwith/gcx/issues/192)) ([9fac655](https://github.com/JustinBeckwith/gcx/commit/9fac655b1eb326ec7106547a5d40c63d6e2fa84c))
* **deps:** update to meow 6.x ([#74](https://github.com/JustinBeckwith/gcx/issues/74)) ([f3e8481](https://github.com/JustinBeckwith/gcx/commit/f3e848155cca53ba43c393f234950c62bc1d6ae4))
* **deps:** upgrade to the latest googleapis ([#329](https://github.com/JustinBeckwith/gcx/issues/329)) ([3ca4665](https://github.com/JustinBeckwith/gcx/commit/3ca4665a8e597c46654bf7b3ce7c608e39177f52))
* do not pass scopes to getClient ([#46](https://github.com/JustinBeckwith/gcx/issues/46)) ([3083f45](https://github.com/JustinBeckwith/gcx/commit/3083f45b3802b63ac9909dd1b1c33d31ca4a0019))
* make an offering to the lint gods ([46b4f2d](https://github.com/JustinBeckwith/gcx/commit/46b4f2d99b99495263d14cbd3116dcc351105957))
* migrate to esm ([#174](https://github.com/JustinBeckwith/gcx/issues/174)) ([08ba9a1](https://github.com/JustinBeckwith/gcx/commit/08ba9a19b93c35909010f88ed3d5023b0b40fe13))
* normalize gcx.call functionName param ([#19](https://github.com/JustinBeckwith/gcx/issues/19)) ([ccb2762](https://github.com/JustinBeckwith/gcx/commit/ccb27622178b4b74fd94c45c3c0bbf9e19391b60))
* require node 16 and up ([#218](https://github.com/JustinBeckwith/gcx/issues/218)) ([8737e7f](https://github.com/JustinBeckwith/gcx/commit/8737e7f64a326e5536a9152bbfabe0130578e4ab))
* run the linter ([5c19c98](https://github.com/JustinBeckwith/gcx/commit/5c19c982d9d8899ab45edcc7fea08ad869cf6423))
* **types:** remove ora and globby type packages ([#22](https://github.com/JustinBeckwith/gcx/issues/22)) ([7c255cf](https://github.com/JustinBeckwith/gcx/commit/7c255cfcd31894e1d0f454186817af65bdbece9b))
* update deps and move to xo ([#244](https://github.com/JustinBeckwith/gcx/issues/244)) ([07b6d07](https://github.com/JustinBeckwith/gcx/commit/07b6d07fcfab792db4ae5f62d5afe6e44117a58e))
* update list of available runtimes and default ([#128](https://github.com/JustinBeckwith/gcx/issues/128)) ([7ee4a68](https://github.com/JustinBeckwith/gcx/commit/7ee4a687c1538e4cb92e661b4a709b6bf0e15298))
* use default import for fetch ([f3a6d1b](https://github.com/JustinBeckwith/gcx/commit/f3a6d1b1d6feaf7ab9322888dfcbd9dddd898573))


### Miscellaneous Chores

* drop support for node 8 ([#66](https://github.com/JustinBeckwith/gcx/issues/66)) ([1256e4f](https://github.com/JustinBeckwith/gcx/commit/1256e4f337ee212fefad67b4aadba6e7a864f24e))


### Build System

* require node 20 and up ([#327](https://github.com/JustinBeckwith/gcx/issues/327)) ([80f3e38](https://github.com/JustinBeckwith/gcx/commit/80f3e38feacd06e768c6087569318cc85a298e06))
