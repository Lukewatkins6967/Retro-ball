using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine.Scripting;

namespace UnityEngine.Networking
{
	[StructLayout(LayoutKind.Sequential)]
	[RequiredByNativeCode]
	public sealed class UnityWebRequest : IDisposable
	{
		internal enum UnityWebRequestMethod
		{
			Get = 0,
			Post = 1,
			Put = 2,
			Head = 3,
			Custom = 4
		}

		internal enum UnityWebRequestError
		{
			OK = 0,
			Unknown = 1,
			SDKError = 2,
			UnsupportedProtocol = 3,
			MalformattedUrl = 4,
			CannotResolveProxy = 5,
			CannotResolveHost = 6,
			CannotConnectToHost = 7,
			AccessDenied = 8,
			GenericHTTPError = 9,
			WriteError = 10,
			ReadError = 11,
			OutOfMemory = 12,
			Timeout = 13,
			HTTPPostError = 14,
			SSLCannotConnect = 15,
			Aborted = 16,
			TooManyRedirects = 17,
			ReceivedNoData = 18,
			SSLNotSupported = 19,
			FailedToSendData = 20,
			FailedToReceiveData = 21,
			SSLCertificateError = 22,
			SSLCipherNotAvailable = 23,
			SSLCACertError = 24,
			UnrecognizedContentEncoding = 25,
			LoginFailed = 26,
			SSLShutdownFailed = 27,
			NoInternetConnection = 28
		}

		public const string kHttpVerbGET = "GET";

		public const string kHttpVerbHEAD = "HEAD";

		public const string kHttpVerbPOST = "POST";

		public const string kHttpVerbPUT = "PUT";

		public const string kHttpVerbCREATE = "CREATE";

		public const string kHttpVerbDELETE = "DELETE";

		[NonSerialized]
		internal IntPtr m_Ptr;

		private static Regex domainRegex = new Regex("^\\s*\\w+(?:\\.\\w+)+\\s*$");

		private static readonly string[] forbiddenHeaderKeys = new string[20]
		{
			"accept-charset", "accept-encoding", "access-control-request-headers", "access-control-request-method", "connection", "content-length", "date", "dnt", "expect", "host",
			"keep-alive", "origin", "referer", "te", "trailer", "transfer-encoding", "upgrade", "user-agent", "via", "x-unity-version"
		};

		public bool disposeDownloadHandlerOnDispose { get; set; }

		public bool disposeUploadHandlerOnDispose { get; set; }

		public string method
		{
			get
			{
				switch ((UnityWebRequestMethod)InternalGetMethod())
				{
				case UnityWebRequestMethod.Get:
					return "GET";
				case UnityWebRequestMethod.Post:
					return "POST";
				case UnityWebRequestMethod.Put:
					return "PUT";
				case UnityWebRequestMethod.Head:
					return "HEAD";
				default:
					return InternalGetCustomMethod();
				}
			}
			set
			{
				if (string.IsNullOrEmpty(value))
				{
					throw new ArgumentException("Cannot set a UnityWebRequest's method to an empty or null string");
				}
				switch (value.ToUpper())
				{
				case "GET":
					InternalSetMethod(UnityWebRequestMethod.Get);
					break;
				case "POST":
					InternalSetMethod(UnityWebRequestMethod.Post);
					break;
				case "PUT":
					InternalSetMethod(UnityWebRequestMethod.Put);
					break;
				case "HEAD":
					InternalSetMethod(UnityWebRequestMethod.Head);
					break;
				default:
					InternalSetCustomMethod(value.ToUpper());
					break;
				}
			}
		}

		public extern string error
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool useHttpContinue
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public string url
		{
			get
			{
				return InternalGetUrl();
			}
			set
			{
				string text = value;
				string uriString = "http://localhost/";
				Uri uri = new Uri(uriString);
				if (text.StartsWith("//"))
				{
					text = uri.Scheme + ":" + text;
				}
				if (text.StartsWith("/"))
				{
					text = uri.Scheme + "://" + uri.Host + text;
				}
				if (domainRegex.IsMatch(text))
				{
					text = uri.Scheme + "://" + text;
				}
				Uri uri2 = null;
				try
				{
					uri2 = new Uri(text);
				}
				catch (FormatException ex)
				{
					try
					{
						uri2 = new Uri(uri, text);
					}
					catch (FormatException)
					{
						throw ex;
					}
				}
				InternalSetUrl(uri2.AbsoluteUri);
			}
		}

		public extern long responseCode
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern float uploadProgress
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isModifiable
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isDone
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isError
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern float downloadProgress
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern ulong uploadedBytes
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern ulong downloadedBytes
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern int redirectLimit
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern bool chunkedTransfer
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern UploadHandler uploadHandler
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern DownloadHandler downloadHandler
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public UnityWebRequest()
		{
			InternalCreate();
			InternalSetDefaults();
		}

		public UnityWebRequest(string url)
		{
			InternalCreate();
			InternalSetDefaults();
			this.url = url;
		}

		public UnityWebRequest(string url, string method)
		{
			InternalCreate();
			InternalSetDefaults();
			this.url = url;
			this.method = method;
		}

		public UnityWebRequest(string url, string method, DownloadHandler downloadHandler, UploadHandler uploadHandler)
		{
			InternalCreate();
			InternalSetDefaults();
			this.url = url;
			this.method = method;
			this.downloadHandler = downloadHandler;
			this.uploadHandler = uploadHandler;
		}

		public static UnityWebRequest Get(string uri)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerBuffer(), null);
		}

		public static UnityWebRequest Delete(string uri)
		{
			return new UnityWebRequest(uri, "DELETE");
		}

		public static UnityWebRequest Head(string uri)
		{
			return new UnityWebRequest(uri, "HEAD");
		}

		public static UnityWebRequest GetTexture(string uri)
		{
			return GetTexture(uri, false);
		}

		public static UnityWebRequest GetTexture(string uri, bool nonReadable)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerTexture(nonReadable), null);
		}

		public static UnityWebRequest GetAudioClip(string uri, AudioType audioType)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerAudioClip(uri, audioType), null);
		}

		public static UnityWebRequest GetAssetBundle(string uri)
		{
			return GetAssetBundle(uri, 0u);
		}

		public static UnityWebRequest GetAssetBundle(string uri, uint crc)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerAssetBundle(uri, crc), null);
		}

		public static UnityWebRequest GetAssetBundle(string uri, uint version, uint crc)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerAssetBundle(uri, version, crc), null);
		}

		public static UnityWebRequest GetAssetBundle(string uri, Hash128 hash, uint crc)
		{
			return new UnityWebRequest(uri, "GET", new DownloadHandlerAssetBundle(uri, hash, crc), null);
		}

		public static UnityWebRequest Put(string uri, byte[] bodyData)
		{
			return new UnityWebRequest(uri, "PUT", new DownloadHandlerBuffer(), new UploadHandlerRaw(bodyData));
		}

		public static UnityWebRequest Put(string uri, string bodyData)
		{
			return new UnityWebRequest(uri, "PUT", new DownloadHandlerBuffer(), new UploadHandlerRaw(Encoding.UTF8.GetBytes(bodyData)));
		}

		public static UnityWebRequest Post(string uri, string postData)
		{
			UnityWebRequest unityWebRequest = new UnityWebRequest(uri, "POST");
			string s = WWWTranscoder.URLEncode(postData, Encoding.UTF8);
			unityWebRequest.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(s));
			unityWebRequest.uploadHandler.contentType = "application/x-www-form-urlencoded";
			unityWebRequest.downloadHandler = new DownloadHandlerBuffer();
			return unityWebRequest;
		}

		public static UnityWebRequest Post(string uri, WWWForm formData)
		{
			UnityWebRequest unityWebRequest = new UnityWebRequest(uri, "POST");
			unityWebRequest.uploadHandler = new UploadHandlerRaw(formData.data);
			unityWebRequest.downloadHandler = new DownloadHandlerBuffer();
			Dictionary<string, string> headers = formData.headers;
			foreach (KeyValuePair<string, string> item in headers)
			{
				unityWebRequest.SetRequestHeader(item.Key, item.Value);
			}
			return unityWebRequest;
		}

		public static UnityWebRequest Post(string uri, List<IMultipartFormSection> multipartFormSections)
		{
			byte[] boundary = GenerateBoundary();
			return Post(uri, multipartFormSections, boundary);
		}

		public static UnityWebRequest Post(string uri, List<IMultipartFormSection> multipartFormSections, byte[] boundary)
		{
			UnityWebRequest unityWebRequest = new UnityWebRequest(uri, "POST");
			byte[] data = SerializeFormSections(multipartFormSections, boundary);
			UploadHandler uploadHandler = new UploadHandlerRaw(data);
			uploadHandler.contentType = "multipart/form-data; boundary=" + Encoding.UTF8.GetString(boundary, 0, boundary.Length);
			unityWebRequest.uploadHandler = uploadHandler;
			unityWebRequest.downloadHandler = new DownloadHandlerBuffer();
			return unityWebRequest;
		}

		public static UnityWebRequest Post(string uri, Dictionary<string, string> formFields)
		{
			UnityWebRequest unityWebRequest = new UnityWebRequest(uri, "POST");
			byte[] data = SerializeSimpleForm(formFields);
			UploadHandler uploadHandler = new UploadHandlerRaw(data);
			uploadHandler.contentType = "application/x-www-form-urlencoded";
			unityWebRequest.uploadHandler = uploadHandler;
			unityWebRequest.downloadHandler = new DownloadHandlerBuffer();
			return unityWebRequest;
		}

		public static byte[] SerializeFormSections(List<IMultipartFormSection> multipartFormSections, byte[] boundary)
		{
			byte[] bytes = Encoding.UTF8.GetBytes("\r\n");
			int num = 0;
			foreach (IMultipartFormSection multipartFormSection in multipartFormSections)
			{
				num += 64 + multipartFormSection.sectionData.Length;
			}
			List<byte> list = new List<byte>(num);
			foreach (IMultipartFormSection multipartFormSection2 in multipartFormSections)
			{
				string text = "form-data";
				string sectionName = multipartFormSection2.sectionName;
				string fileName = multipartFormSection2.fileName;
				if (!string.IsNullOrEmpty(fileName))
				{
					text = "file";
				}
				string text2 = "Content-Disposition: " + text;
				if (!string.IsNullOrEmpty(sectionName))
				{
					text2 = text2 + "; name=\"" + sectionName + "\"";
				}
				if (!string.IsNullOrEmpty(fileName))
				{
					text2 = text2 + "; filename=\"" + fileName + "\"";
				}
				text2 += "\r\n";
				string contentType = multipartFormSection2.contentType;
				if (!string.IsNullOrEmpty(contentType))
				{
					text2 = text2 + "Content-Type: " + contentType + "\r\n";
				}
				list.AddRange(boundary);
				list.AddRange(bytes);
				list.AddRange(Encoding.UTF8.GetBytes(text2));
				list.AddRange(bytes);
				list.AddRange(multipartFormSection2.sectionData);
			}
			list.TrimExcess();
			return list.ToArray();
		}

		public static byte[] GenerateBoundary()
		{
			byte[] array = new byte[40];
			for (int i = 0; i < 40; i++)
			{
				int num = Random.Range(48, 110);
				if (num > 57)
				{
					num += 7;
				}
				if (num > 90)
				{
					num += 6;
				}
				array[i] = (byte)num;
			}
			return array;
		}

		public static byte[] SerializeSimpleForm(Dictionary<string, string> formFields)
		{
			string text = string.Empty;
			foreach (KeyValuePair<string, string> formField in formFields)
			{
				if (text.Length > 0)
				{
					text += "&";
				}
				text = text + Uri.EscapeDataString(formField.Key) + "=" + Uri.EscapeDataString(formField.Value);
			}
			return Encoding.UTF8.GetBytes(text);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalCreate();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[ThreadAndSerializationSafe]
		internal extern void InternalDestroy();

		private void InternalSetDefaults()
		{
			disposeDownloadHandlerOnDispose = true;
			disposeUploadHandlerOnDispose = true;
		}

		~UnityWebRequest()
		{
			InternalDestroy();
		}

		public void Dispose()
		{
			if (disposeDownloadHandlerOnDispose)
			{
				DownloadHandler downloadHandler = this.downloadHandler;
				if (downloadHandler != null)
				{
					downloadHandler.Dispose();
				}
			}
			if (disposeUploadHandlerOnDispose)
			{
				UploadHandler uploadHandler = this.uploadHandler;
				if (uploadHandler != null)
				{
					uploadHandler.Dispose();
				}
			}
			InternalDestroy();
			GC.SuppressFinalize(this);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern AsyncOperation InternalBegin();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalAbort();

		public AsyncOperation Send()
		{
			return InternalBegin();
		}

		public void Abort()
		{
			InternalAbort();
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalSetMethod(UnityWebRequestMethod methodType);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalSetCustomMethod(string customMethodName);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern int InternalGetMethod();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern string InternalGetCustomMethod();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern int InternalGetError();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern string InternalGetUrl();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void InternalSetUrl(string url);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string GetRequestHeader(string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void InternalSetRequestHeader(string name, string value);

		public void SetRequestHeader(string name, string value)
		{
			if (string.IsNullOrEmpty(name))
			{
				throw new ArgumentException("Cannot set a Request Header with a null or empty name");
			}
			if (string.IsNullOrEmpty(value))
			{
				throw new ArgumentException("Cannot set a Request header with a null or empty value");
			}
			if (!IsHeaderNameLegal(name))
			{
				throw new ArgumentException("Cannot set Request Header " + name + " - name contains illegal characters or is not user-overridable");
			}
			if (!IsHeaderValueLegal(value))
			{
				throw new ArgumentException("Cannot set Request Header - value contains illegal characters");
			}
			InternalSetRequestHeader(name, value);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string GetResponseHeader(string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern string[] InternalGetResponseHeaderKeys();

		public Dictionary<string, string> GetResponseHeaders()
		{
			string[] array = InternalGetResponseHeaderKeys();
			if (array == null)
			{
				return null;
			}
			Dictionary<string, string> dictionary = new Dictionary<string, string>(array.Length, StringComparer.OrdinalIgnoreCase);
			for (int i = 0; i < array.Length; i++)
			{
				string responseHeader = GetResponseHeader(array[i]);
				dictionary.Add(array[i], responseHeader);
			}
			return dictionary;
		}

		private static bool ContainsForbiddenCharacters(string s, int firstAllowedCharCode)
		{
			foreach (char c in s)
			{
				if (c < firstAllowedCharCode || c == '\u007f')
				{
					return true;
				}
			}
			return false;
		}

		private static bool IsHeaderNameLegal(string headerName)
		{
			if (string.IsNullOrEmpty(headerName))
			{
				return false;
			}
			headerName = headerName.ToLower();
			if (ContainsForbiddenCharacters(headerName, 33))
			{
				return false;
			}
			if (headerName.StartsWith("sec-") || headerName.StartsWith("proxy-"))
			{
				return false;
			}
			string[] array = forbiddenHeaderKeys;
			foreach (string b in array)
			{
				if (string.Equals(headerName, b))
				{
					return false;
				}
			}
			return true;
		}

		private static bool IsHeaderValueLegal(string headerValue)
		{
			if (string.IsNullOrEmpty(headerValue))
			{
				return false;
			}
			if (ContainsForbiddenCharacters(headerValue, 32))
			{
				return false;
			}
			return true;
		}

		private static string GetErrorDescription(UnityWebRequestError errorCode)
		{
			switch (errorCode)
			{
			case UnityWebRequestError.OK:
				return "No Error";
			case UnityWebRequestError.SDKError:
				return "Internal Error With Transport Layer";
			case UnityWebRequestError.UnsupportedProtocol:
				return "Specified Transport Protocol is Unsupported";
			case UnityWebRequestError.MalformattedUrl:
				return "URL is Malformatted";
			case UnityWebRequestError.CannotResolveProxy:
				return "Unable to resolve specified proxy server";
			case UnityWebRequestError.CannotResolveHost:
				return "Unable to resolve host specified in URL";
			case UnityWebRequestError.CannotConnectToHost:
				return "Unable to connect to host specified in URL";
			case UnityWebRequestError.AccessDenied:
				return "Remote server denied access to the specified URL";
			case UnityWebRequestError.GenericHTTPError:
				return "Unknown/Generic HTTP Error - Check HTTP Error code";
			case UnityWebRequestError.WriteError:
				return "Error when transmitting request to remote server - transmission terminated prematurely";
			case UnityWebRequestError.ReadError:
				return "Error when reading response from remote server - transmission terminated prematurely";
			case UnityWebRequestError.OutOfMemory:
				return "Out of Memory";
			case UnityWebRequestError.Timeout:
				return "Timeout occurred while waiting for response from remote server";
			case UnityWebRequestError.HTTPPostError:
				return "Error while transmitting HTTP POST body data";
			case UnityWebRequestError.SSLCannotConnect:
				return "Unable to connect to SSL server at remote host";
			case UnityWebRequestError.Aborted:
				return "Request was manually aborted by local code";
			case UnityWebRequestError.TooManyRedirects:
				return "Redirect limit exceeded";
			case UnityWebRequestError.ReceivedNoData:
				return "Received an empty response from remote host";
			case UnityWebRequestError.SSLNotSupported:
				return "SSL connections are not supported on the local machine";
			case UnityWebRequestError.FailedToSendData:
				return "Failed to transmit body data";
			case UnityWebRequestError.FailedToReceiveData:
				return "Failed to receive response body data";
			case UnityWebRequestError.SSLCertificateError:
				return "Failure to authenticate SSL certificate of remote host";
			case UnityWebRequestError.SSLCipherNotAvailable:
				return "SSL cipher received from remote host is not supported on the local machine";
			case UnityWebRequestError.SSLCACertError:
				return "Failure to authenticate Certificate Authority of the SSL certificate received from the remote host";
			case UnityWebRequestError.UnrecognizedContentEncoding:
				return "Remote host returned data with an unrecognized/unparseable content encoding";
			case UnityWebRequestError.LoginFailed:
				return "HTTP authentication failed";
			case UnityWebRequestError.SSLShutdownFailed:
				return "Failure while shutting down SSL connection";
			default:
				return "Unknown error";
			}
		}
	}
}
