using System;
using System.Runtime.CompilerServices;
using UnityEngine.Internal;

namespace UnityEngine
{
	public class Material : Object
	{
		public extern Shader shader
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public Color color
		{
			get
			{
				return GetColor("_Color");
			}
			set
			{
				SetColor("_Color", value);
			}
		}

		public Texture mainTexture
		{
			get
			{
				return GetTexture("_MainTex");
			}
			set
			{
				SetTexture("_MainTex", value);
			}
		}

		public Vector2 mainTextureOffset
		{
			get
			{
				return GetTextureOffset("_MainTex");
			}
			set
			{
				SetTextureOffset("_MainTex", value);
			}
		}

		public Vector2 mainTextureScale
		{
			get
			{
				return GetTextureScale("_MainTex");
			}
			set
			{
				SetTextureScale("_MainTex", value);
			}
		}

		public extern int passCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern int renderQueue
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern string[] shaderKeywords
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern MaterialGlobalIlluminationFlags globalIlluminationFlags
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		[Obsolete("Creating materials from shader source string is no longer supported. Use Shader assets instead.")]
		public Material(string contents)
		{
			Internal_CreateWithString(this, contents);
		}

		public Material(Shader shader)
		{
			Internal_CreateWithShader(this, shader);
		}

		public Material(Material source)
		{
			Internal_CreateWithMaterial(this, source);
		}

		public void SetColor(string propertyName, Color color)
		{
			SetColor(Shader.PropertyToID(propertyName), color);
		}

		public void SetColor(int nameID, Color color)
		{
			INTERNAL_CALL_SetColor(this, nameID, ref color);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetColor(Material self, int nameID, ref Color color);

		public Color GetColor(string propertyName)
		{
			return GetColor(Shader.PropertyToID(propertyName));
		}

		public Color GetColor(int nameID)
		{
			Color value;
			INTERNAL_CALL_GetColor(this, nameID, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetColor(Material self, int nameID, out Color value);

		public void SetVector(string propertyName, Vector4 vector)
		{
			SetColor(propertyName, new Color(vector.x, vector.y, vector.z, vector.w));
		}

		public void SetVector(int nameID, Vector4 vector)
		{
			SetColor(nameID, new Color(vector.x, vector.y, vector.z, vector.w));
		}

		public Vector4 GetVector(string propertyName)
		{
			Color color = GetColor(propertyName);
			return new Vector4(color.r, color.g, color.b, color.a);
		}

		public Vector4 GetVector(int nameID)
		{
			Color color = GetColor(nameID);
			return new Vector4(color.r, color.g, color.b, color.a);
		}

		public void SetTexture(string propertyName, Texture texture)
		{
			SetTexture(Shader.PropertyToID(propertyName), texture);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetTexture(int nameID, Texture texture);

		public Texture GetTexture(string propertyName)
		{
			return GetTexture(Shader.PropertyToID(propertyName));
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern Texture GetTexture(int nameID);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_GetTextureScaleAndOffset(Material mat, string name, out Vector4 output);

		public void SetTextureOffset(string propertyName, Vector2 offset)
		{
			INTERNAL_CALL_SetTextureOffset(this, propertyName, ref offset);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetTextureOffset(Material self, string propertyName, ref Vector2 offset);

		public Vector2 GetTextureOffset(string propertyName)
		{
			Vector4 output;
			Internal_GetTextureScaleAndOffset(this, propertyName, out output);
			return new Vector2(output.z, output.w);
		}

		public void SetTextureScale(string propertyName, Vector2 scale)
		{
			INTERNAL_CALL_SetTextureScale(this, propertyName, ref scale);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetTextureScale(Material self, string propertyName, ref Vector2 scale);

		public Vector2 GetTextureScale(string propertyName)
		{
			Vector4 output;
			Internal_GetTextureScaleAndOffset(this, propertyName, out output);
			return new Vector2(output.x, output.y);
		}

		public void SetMatrix(string propertyName, Matrix4x4 matrix)
		{
			SetMatrix(Shader.PropertyToID(propertyName), matrix);
		}

		public void SetMatrix(int nameID, Matrix4x4 matrix)
		{
			INTERNAL_CALL_SetMatrix(this, nameID, ref matrix);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetMatrix(Material self, int nameID, ref Matrix4x4 matrix);

		public Matrix4x4 GetMatrix(string propertyName)
		{
			return GetMatrix(Shader.PropertyToID(propertyName));
		}

		public Matrix4x4 GetMatrix(int nameID)
		{
			Matrix4x4 value;
			INTERNAL_CALL_GetMatrix(this, nameID, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetMatrix(Material self, int nameID, out Matrix4x4 value);

		public void SetFloat(string propertyName, float value)
		{
			SetFloat(Shader.PropertyToID(propertyName), value);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetFloat(int nameID, float value);

		public float GetFloat(string propertyName)
		{
			return GetFloat(Shader.PropertyToID(propertyName));
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern float GetFloat(int nameID);

		public void SetFloatArray(string name, float[] values)
		{
			SetFloatArray(Shader.PropertyToID(name), values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetFloatArray(int nameID, float[] values);

		public void SetVectorArray(string name, Vector4[] values)
		{
			SetVectorArray(Shader.PropertyToID(name), values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetVectorArray(int nameID, Vector4[] values);

		public void SetColorArray(string name, Color[] values)
		{
			SetColorArray(Shader.PropertyToID(name), values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetColorArray(int nameID, Color[] values);

		public void SetMatrixArray(string name, Matrix4x4[] values)
		{
			SetMatrixArray(Shader.PropertyToID(name), values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetMatrixArray(int nameID, Matrix4x4[] values);

		public void SetInt(string propertyName, int value)
		{
			SetFloat(propertyName, value);
		}

		public void SetInt(int nameID, int value)
		{
			SetFloat(nameID, value);
		}

		public int GetInt(string propertyName)
		{
			return (int)GetFloat(propertyName);
		}

		public int GetInt(int nameID)
		{
			return (int)GetFloat(nameID);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetBuffer(string propertyName, ComputeBuffer buffer);

		public bool HasProperty(string propertyName)
		{
			return HasProperty(Shader.PropertyToID(propertyName));
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern bool HasProperty(int nameID);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string GetTag(string tag, bool searchFallbacks, [DefaultValue("\"\"")] string defaultValue);

		[ExcludeFromDocs]
		public string GetTag(string tag, bool searchFallbacks)
		{
			string empty = string.Empty;
			return GetTag(tag, searchFallbacks, empty);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void SetOverrideTag(string tag, string val);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void Lerp(Material start, Material end, float t);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern bool SetPass(int pass);

		[Obsolete("Creating materials from shader source string will be removed in the future. Use Shader assets instead.")]
		public static Material Create(string scriptContents)
		{
			return new Material(scriptContents);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_CreateWithString([Writable] Material mono, string contents);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_CreateWithShader([Writable] Material mono, Shader shader);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_CreateWithMaterial([Writable] Material mono, Material source);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void CopyPropertiesFromMaterial(Material mat);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void EnableKeyword(string keyword);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void DisableKeyword(string keyword);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern bool IsKeywordEnabled(string keyword);
	}
}
