UCI API info


Rider details
https://www.uci.org/api/riders/MTB/2025?page=1
{"totalItems":608,"page":1,"pageSize":25,"items":[{"givenName":"Ian","familyName":"ACKERT","countryCode":"CAN","teamName":"TREK FUTURE RACING (TFU)","format":"XC","url":"/rider-details/542795"},{"givenName":"Lacey","familyName":"ADAMS","countryCode":"AUS","teamName":"YETI / FOX FACTORY RACE TEAM (YET)","format":"EDR","url":"/rider-details/1381633"},{"givenName":"Lauren","familyName":"AGGELER","countryCode":"USA","teamName":"TRINITY RACING (TRI)","format":"XC","url":"/rider-details/1057661"},{"givenName":"Kye","familyName":"A'HERN","countryCode":"AUS","teamName":"KENDA NS BIKES UR TEAM (KNU)","format":"DH","url":"/rider-details/438539"},{"givenName":"Sian","familyName":"A'HERN","countryCode":"AUS","teamName":"YT RACING DEVELOPMENT (YTR)","format":"DH","url":"/rider-details/108020"},{"givenName":"Vital","familyName":"ALBIN","countryCode":"SUI","teamName":"THÖMUS MAXON (TMR)","format":"XC","url":"/rider-details/101295"},{"givenName":"Micha","familyName":"ALDER","countryCode":"SUI","teamName":"BIXS PERFORMANCE RACE TEAM (BPR)","format":"XC","url":"/rider-details/1096848"},{"givenName":"Charlie","familyName":"ALDRIDGE","countryCode":"GBR","teamName":"CANNONDALE FACTORY RACING (CFR)","format":"XC","url":"/rider-details/239377"},{"givenName":"Wout","familyName":"ALLEMAN","countryCode":"BEL","teamName":"BUFF MEGAMO TEAM (BMT)","format":"XCM","url":"/rider-details/88207"},{"givenName":" Max","familyName":"ALRAN","countryCode":"FRA","teamName":"COMMENCAL/MUC-OFF BY RIDING ADDICTION (CMO)","format":"DH","url":"/rider-details/673156"},{"givenName":" Till","familyName":"ALRAN","countryCode":"FRA","teamName":"COMMENCAL/MUC-OFF BY RIDING ADDICTION (CMO)","format":"DH","url":"/rider-details/673161"},{"givenName":"Riley","familyName":"AMOS","countryCode":"USA","teamName":"TREK FACTORY RACING - PIRELLI (TFR)","format":"XC","url":"/rider-details/590752"},{"givenName":"Edrick","familyName":"ANAYA HERNANDEZ","countryCode":"PUR","teamName":"PAN-AMERICAN UNION RACING (PAU)","format":"XC","url":"/rider-details/1132630"},{"givenName":"Adrien","familyName":"ANCIAUX","countryCode":"BEL","teamName":"BH-WALLONIE MTB TEAM (BHW)","format":"XC","url":"/rider-details/782990"},{"givenName":" Alix","familyName":"ANDRE GALLIS","countryCode":"FRA","teamName":"SUNN FACTORY RACING  (TSF)","format":"XC","url":"/rider-details/662049"},{"givenName":"Simon","familyName":"ANDREASSEN","countryCode":"DEN","teamName":"ORBEA FOX FACTORY TEAM (ORB)","format":"XC","url":"/rider-details/94363"},{"givenName":"Marti","familyName":"ARAN CALONJA","countryCode":"ESP","teamName":"CANNONDALE ISB SPORT (TBE)","format":"XCM","url":"/rider-details/112288"},{"givenName":"Louison","familyName":"ARNAUD","countryCode":"FRA","teamName":"THEORY RACING (THR)","format":"EDR","url":"/rider-details/887402"},{"givenName":"Dan","familyName":"ATHERTON","countryCode":"GBR","teamName":"CONTINENTAL ATHERTON  (ATH)","format":"DH","url":"/rider-details/34342"},{"givenName":"Gee","familyName":"ATHERTON","countryCode":"GBR","teamName":"CONTINENTAL ATHERTON  (ATH)","format":"DH","url":"/rider-details/34343"},{"givenName":"Rachel","familyName":"ATHERTON","countryCode":"GBR","teamName":"CONTINENTAL ATHERTON  (ATH)","format":"DH","url":"/rider-details/34344"},{"givenName":"Raphael","familyName":"AUCLAIR","countryCode":"CAN","teamName":"PIVOT CYCLES - OTE (OTE)","format":"XC","url":"/rider-details/93564"},{"givenName":"Simone","familyName":"AVONDETTO","countryCode":"ITA","teamName":"WILIER-VITTORIA FACTORY TEAM (WVT)","format":"XC","url":"/rider-details/299250"},{"givenName":" Maxime","familyName":"AYRAL","countryCode":"FRA","teamName":"TEAM BAGNOL JO.WE OMEGA (BJO)","format":"XC","url":"/rider-details/661987"},{"givenName":" Mathis","familyName":"AZZARO","countryCode":"FRA","teamName":"ORIGINE RACING DIVISION (ORD)","format":"XC","url":"/rider-details/272790"}]}


Rankings iframe:
https://dataride.uci.ch/iframe/RankingDetails/149?disciplineId=7&groupId=36&momentId=190774&disciplineSeasonId=445&rankingTypeId=1&categoryId=22&raceTypeId=19

And API call:
fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
  "headers": {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,de;q=0.7",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
    "cookie": "asp_uci_tr_sessionId=ck4tip5ovs11rdekd4ey1hwu; _gid=GA1.2.2118974486.1747647355; _gat_gtag_UA_119708018_2=1; _ga_B0MY5ZF3TY=GS2.1.s1747647355$o3$g1$t1747648789$j0$l0$h0; _ga=GA1.1.280823569.1747161900",
    "Referer": "https://dataride.uci.ch/iframe/RankingDetails/149?disciplineId=7&groupId=36&momentId=190774&disciplineSeasonId=445&rankingTypeId=1&categoryId=22&raceTypeId=19",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "body": "rankingId=149&disciplineId=7&rankingTypeId=1&take=40&skip=0&page=1&pageSize=40&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=22&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445&filter%5Bfilters%5D%5B3%5D%5Bfield%5D=MomentId&filter%5Bfilters%5D%5B3%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B4%5D%5Bfield%5D=CountryId&filter%5Bfilters%5D%5B4%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B5%5D%5Bfield%5D=IndividualName&filter%5Bfilters%5D%5B5%5D%5Bvalue%5D=&filter%5Bfilters%5D%5B6%5D%5Bfield%5D=TeamName&filter%5Bfilters%5D%5B6%5D%5Bvalue%5D=",
  "method": "POST"
});

Mens is categoryId 22 and women's is 23.


