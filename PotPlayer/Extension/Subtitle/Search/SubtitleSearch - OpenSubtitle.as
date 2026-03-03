/*
	subtitle search by opensubtitle
*/

// void OnInitialize()
// void OnFinalize()
// string GetTitle() 																-> get title for UI
// string GetVersion																-> get version for manage
// string GetDesc()																	-> get detail information
// string GetLoginTitle()															-> get title for login dialog
// string GetLoginDesc()															-> get desc for login dialog
// string GetUserText()																-> get user text for login dialog
// string GetPasswordText()															-> get password text for login dialog
// string ServerCheck(string User, string Pass) 									-> server check
// string ServerLogin(string User, string Pass) 									-> login
// void ServerLogout() 																-> logout
//------------------------------------------------------------------------------------------------
// string GetLanguages()															-> get support language
// string SubtitleWebSearch(string MovieFileName, dictionary MovieMetaData)			-> search subtitle bu web browser
// array<dictionary> SubtitleSearch(string MovieFileName, dictionary MovieMetaData)	-> search subtitle
// string SubtitleDownload(string id)												-> download subtitle
// string GetUploadFormat()															-> upload format
// string SubtitleUpload(string MovieFileName, dictionary MovieMetaData, string SubtitleName, string SubtitleContent)	-> upload subtitle
 
uint64 GetHash(string FileName, int64 &out size)
{
	uint64 hash = 0;
	uintptr fp = HostFileOpen(FileName);
	
	size = 0;
	if (fp != 0)
	{
		size = HostFileLength(fp);
		hash = size;
		
		for (int i = 0; i < 65536 / 8; i++) hash = hash + HostFileReadQWORD(fp);
		
		int64 ep = size - 65536;
		if (ep < 0) ep = 0;

		HostFileSeek(fp, ep, 0);
		for (int i = 0; i < 65536 / 8; i++) hash = hash + HostFileReadQWORD(fp);

		HostFileClose(fp);
	}
	
	return hash;
}

string Token = "";
string ApiHost = "https://api.opensubtitles.com/";

string GetTitle()
{
	return "OpenSubtitles";
}

string GetVersion()
{
	return "1";
}

string GetDesc()
{
	return "https://www.opensubtitles.com/";
}

string GetLanguages()
{
	string ret = "ab, af, am, an, ar, as, at, az, be, bg, bn, br, bs, ca, cy, cs, da, de, ea, el";
	
	ret += ", en, eo, es, et, eu, ex, fa, fi, fr, ga, gd, gl, he, hi, hr, hu, hy, ia, id, ig, is, it, ja";
	ret += ", ka, kk, km, kn, ko, ku, lb, lt, lv, ma, me, mk, ml, mn, mr, ms, my, ne, nl, no, nv, oc, or";
	ret += ", pb, pl, pm, pr, ps, pt, ro, ru, sd, se, si, sk, sl, so, sp, sq, sr, sv, sw, sx, sy, ta, te";
	ret += ", th, tl, tr, tp, tt, uk, ur, uz, vi, ze, zh, zt";
	return ret;
}

string GetLoginTitle()
{
	return "";
}

string GetLoginDesc()
{
	return "";
}

string ServerCheck(string User, string Pass)
{
	string url = ApiHost + "languages";
	string text = HostUrlGetString(url);
	string ret = "fail";
	JsonReader reader;
	JsonValue root;

	if (reader.parse(text, root) && root.isObject())
	{
		ret = "ok";
	}
	return ret;
}

string ServerLogin(string User, string Pass)
{
	string headers = "Content-Type: application/json\r\n";
	headers += "Api-Key: " + HostGetApiKey(ApiHost) + "\r\n";
	headers += "Accept: application/json\r\n";
	
	string post = "{ \"username\": \"" + User + "\", \"password\": \"" + Pass + "\" }";
	
	string data = HostUrlGetString(ApiHost + "api/v1/login", "", headers, post);
	string ret = "fail";
	JsonReader reader;
	JsonValue root;
	if (reader.parse(data, root) && root.isObject())
	{
		JsonValue token = root["token"];

		if (token.isString())
		{
			Token = token.asString();
			ret = "ok";
		}
	}
	return ret;
}

void ServerLogout()
{
	if (!Token.empty())
	{
		string headers = "Accept: application/json\r\n";
		headers += "Api-Key: " + HostGetApiKey(ApiHost) + "\r\n";
		headers += "Authorization: Bearer " + Token + "\r\n";
		
		HostUrlGetString(ApiHost + "api/v1/logout", "", headers);

		Token = "";
	}
}

string SubtitleWebSearch(string MovieFileName, dictionary MovieMetaData)
{
	string url = "https://www.opensubtitles.org/isdb/index.php?";
	int64 size = 0;
	uint64 hash = GetHash(MovieFileName, size);
	string title = string(MovieMetaData["title"]);
	string param = "name[0]=" + HostUrlEncode(title) + "&hash[0]=" + formatUInt(hash, "0h", 16) + "&size[0]=" + formatUInt(size, "0h", 16);
	
	return url + param;
}

array<dictionary> SubtitleSearch(string MovieFileName, dictionary MovieMetaData)
{
	int64 size = 0;
	uint64 hash = GetHash(MovieFileName, size);
	string fileName = string(MovieMetaData["fileName"]);
	string fileExtension = string(MovieMetaData["fileExtension"]);
	string title = string(MovieMetaData["title"]);

	string url = "api/v1/subtitles";
	string sep = "?";
	if (hash != 0)
	{
		url += sep;
		url += "moviehash=" + formatUInt(hash, "0h", 16);
		sep = "&";
	}
	string query;
	if (!fileName.empty()) query = fileName + "." + fileExtension;
	else if (!title.empty()) query = title;	
	if (!query.empty()) url += sep + "query=" + HostUrlEncode(query);

	string headers = "Api-Key: " + HostGetApiKey(ApiHost) + "\r\n";
	
	string result = HostUrlGetString(ApiHost + url, "", headers);
	
	array<dictionary> ret;
	if (!result.empty())
	{
		JsonReader reader;
		JsonValue root;
		if (reader.parse(result, root) && root.isObject())
		{
			JsonValue data = root["data"];

			if (data.isArray())
			{
				for(int i = 0, len = data.size(); i < len; i++)
				{
					JsonValue it = data[i];
			
					if (it.isObject())
					{
						JsonValue attributes = it["attributes"];

						if (attributes.isObject())
						{
							JsonValue files = attributes["files"];

							if (files.isArray())
							{
								JsonValue files0 = files[0];

								if (files0.isObject())
								{
									JsonValue file_id = files0["file_id"];

									if (file_id.isInt())
									{
										dictionary item;
										
										item["id"] = file_id.asString();

										item["title"] = title;

										item["format"] = "srt";

										JsonValue nb_cd = attributes["nb_cd"];
										JsonValue cd_number = files0["cd_number"];
										if (nb_cd.isInt() && cd_number.isInt())
										{
											item["disc"] = cd_number.asString() + "/" + nb_cd.asString();
										}

										JsonValue download_count = attributes["download_count"];
										if (download_count.isInt()) item["downloadCount"] = download_count.asString();

										JsonValue language = attributes["language"];
										if (language.isString()) item["lang"] = language.asString();

										JsonValue hearing_impaired = attributes["hearing_impaired"];
										if (hearing_impaired.isBool() && hearing_impaired.asBool()) item["hearingImpaired"] = "true";

										JsonValue file_name = files0["file_name"];
										if (file_name.isString()) item["fileName"] = file_name.asString();

										JsonValue feature_details = attributes["feature_details"];
										if (feature_details.isObject())
										{
											JsonValue year = feature_details["year"];
											if (year.isInt()) item["year"] = year.asString();

											JsonValue season_number = feature_details["season_number"];
											if (season_number.isInt()) item["seasonNumber"] = season_number.asString();

											JsonValue episode_number = feature_details["episode_number"];
											if (episode_number.isInt()) item["episodeNumber"] = episode_number.asString();

											JsonValue imdb_id = feature_details["imdb_id"];
											if (imdb_id.isInt()) item["imdb"] = imdb_id.asString();
										}

										JsonValue moviehash_match = attributes["moviehash_match"];
										if (moviehash_match.isBool() && moviehash_match.asBool()) item["exactMatch"] = "true";

										JsonValue url = attributes["url"];
										if (url.isString()) item["url"] = url.asString();

										ret.insertLast(item);
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return ret;
}

string SubtitleDownload(string id)
{
	string headers = "Content-Type: application/json\r\n";
	headers += "Api-Key: " + HostGetApiKey(ApiHost) + "\r\n";
	headers += "Accept: application/json\r\n";
	if (!Token.empty()) headers += "Authorization: Bearer " + Token + "\r\n";
	string post = "{ \"file_id\": " + id + " }";
	string result = HostUrlGetString(ApiHost + "api/v1/download", "", headers, post);

	if (!result.empty())
	{
		JsonReader reader;
		JsonValue root;
		if (reader.parse(result, root) && root.isObject())
		{
			JsonValue link = root["link"];

			if (link.isString()) return HostUrlGetString(link.asString());
		}
	}
	return "";
}

string GetUploadFormat()
{
	return "srt";
}
