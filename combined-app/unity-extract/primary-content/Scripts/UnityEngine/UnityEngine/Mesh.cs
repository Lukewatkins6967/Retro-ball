using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine.Internal;

namespace UnityEngine
{
	public sealed class Mesh : Object
	{
		internal enum InternalShaderChannel
		{
			Vertex = 0,
			Normal = 1,
			Color = 2,
			TexCoord0 = 3,
			TexCoord1 = 4,
			TexCoord2 = 5,
			TexCoord3 = 6,
			Tangent = 7
		}

		internal enum InternalVertexChannelType
		{
			Float = 0,
			Color = 2
		}

		public extern bool isReadable
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		internal extern bool canAccess
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern int blendShapeCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public Bounds bounds
		{
			get
			{
				Bounds value;
				INTERNAL_get_bounds(out value);
				return value;
			}
			set
			{
				INTERNAL_set_bounds(ref value);
			}
		}

		public extern int vertexCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern int subMeshCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern BoneWeight[] boneWeights
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern Matrix4x4[] bindposes
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public Vector3[] vertices
		{
			get
			{
				return GetAllocArrayFromChannel<Vector3>(InternalShaderChannel.Vertex);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.Vertex, value);
			}
		}

		public Vector3[] normals
		{
			get
			{
				return GetAllocArrayFromChannel<Vector3>(InternalShaderChannel.Normal);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.Normal, value);
			}
		}

		public Vector4[] tangents
		{
			get
			{
				return GetAllocArrayFromChannel<Vector4>(InternalShaderChannel.Tangent);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.Tangent, value);
			}
		}

		public Vector2[] uv
		{
			get
			{
				return GetAllocArrayFromChannel<Vector2>(InternalShaderChannel.TexCoord0);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.TexCoord0, value);
			}
		}

		public Vector2[] uv2
		{
			get
			{
				return GetAllocArrayFromChannel<Vector2>(InternalShaderChannel.TexCoord1);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.TexCoord1, value);
			}
		}

		public Vector2[] uv3
		{
			get
			{
				return GetAllocArrayFromChannel<Vector2>(InternalShaderChannel.TexCoord2);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.TexCoord2, value);
			}
		}

		public Vector2[] uv4
		{
			get
			{
				return GetAllocArrayFromChannel<Vector2>(InternalShaderChannel.TexCoord3);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.TexCoord3, value);
			}
		}

		public Color[] colors
		{
			get
			{
				return GetAllocArrayFromChannel<Color>(InternalShaderChannel.Color);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.Color, value);
			}
		}

		public Color32[] colors32
		{
			get
			{
				return GetAllocArrayFromChannel<Color32>(InternalShaderChannel.Color, InternalVertexChannelType.Color, 1);
			}
			set
			{
				SetArrayForChannel(InternalShaderChannel.Color, InternalVertexChannelType.Color, 1, value);
			}
		}

		public int[] triangles
		{
			get
			{
				if (canAccess)
				{
					return GetTrianglesImpl(-1);
				}
				PrintErrorCantAccessMeshForIndices();
				return new int[0];
			}
			set
			{
				if (canAccess)
				{
					SetTrianglesImpl(-1, value, SafeLength(value));
				}
				else
				{
					PrintErrorCantAccessMeshForIndices();
				}
			}
		}

		public Mesh()
		{
			Internal_Create(this);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_Create([Writable] Mesh mono);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void Clear([DefaultValue("true")] bool keepVertexLayout);

		[ExcludeFromDocs]
		public void Clear()
		{
			bool keepVertexLayout = true;
			Clear(keepVertexLayout);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void PrintErrorCantAccessMesh(InternalShaderChannel channel);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void PrintErrorCantAccessMeshForIndices();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void PrintErrorBadSubmeshIndexTriangles();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern void PrintErrorBadSubmeshIndexIndices();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void SetArrayForChannelImpl(InternalShaderChannel channel, InternalVertexChannelType format, int dim, Array values, int arraySize);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern Array GetAllocArrayFromChannelImpl(InternalShaderChannel channel, InternalVertexChannelType format, int dim);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void GetArrayFromChannelImpl(InternalShaderChannel channel, InternalVertexChannelType format, int dim, Array values);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal extern bool HasChannel(InternalShaderChannel channel);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void ResizeList(object list, int size);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern Array ExtractArrayFromList(object list);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern int[] GetTrianglesImpl(int submesh);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern int[] GetIndicesImpl(int submesh);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void SetTrianglesImpl(int submesh, Array triangles, int arraySize, [DefaultValue("true")] bool calculateBounds);

		[ExcludeFromDocs]
		private void SetTrianglesImpl(int submesh, Array triangles, int arraySize)
		{
			bool calculateBounds = true;
			SetTrianglesImpl(submesh, triangles, arraySize, calculateBounds);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void SetIndicesImpl(int submesh, MeshTopology topology, Array indices, int arraySize, [DefaultValue("true")] bool calculateBounds);

		[ExcludeFromDocs]
		private void SetIndicesImpl(int submesh, MeshTopology topology, Array indices, int arraySize)
		{
			bool calculateBounds = true;
			SetIndicesImpl(submesh, topology, indices, arraySize, calculateBounds);
		}

		[ExcludeFromDocs]
		public void SetTriangles(int[] triangles, int submesh)
		{
			bool calculateBounds = true;
			SetTriangles(triangles, submesh, calculateBounds);
		}

		public void SetTriangles(int[] triangles, int submesh, [DefaultValue("true")] bool calculateBounds)
		{
			if (CheckCanAccessSubmeshTriangles(submesh))
			{
				SetTrianglesImpl(submesh, triangles, SafeLength(triangles), calculateBounds);
			}
		}

		[ExcludeFromDocs]
		public void SetTriangles(List<int> triangles, int submesh)
		{
			bool calculateBounds = true;
			SetTriangles(triangles, submesh, calculateBounds);
		}

		public void SetTriangles(List<int> triangles, int submesh, [DefaultValue("true")] bool calculateBounds)
		{
			if (CheckCanAccessSubmeshTriangles(submesh))
			{
				SetTrianglesImpl(submesh, ExtractArrayFromList(triangles), SafeLength(triangles), calculateBounds);
			}
		}

		[ExcludeFromDocs]
		public void SetIndices(int[] indices, MeshTopology topology, int submesh)
		{
			bool calculateBounds = true;
			SetIndices(indices, topology, submesh, calculateBounds);
		}

		public void SetIndices(int[] indices, MeshTopology topology, int submesh, [DefaultValue("true")] bool calculateBounds)
		{
			if (CheckCanAccessSubmeshIndices(submesh))
			{
				SetIndicesImpl(submesh, topology, indices, SafeLength(indices), calculateBounds);
			}
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void ClearBlendShapes();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern string GetBlendShapeName(int shapeIndex);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern int GetBlendShapeFrameCount(int shapeIndex);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern float GetBlendShapeFrameWeight(int shapeIndex, int frameIndex);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void GetBlendShapeFrameVertices(int shapeIndex, int frameIndex, Vector3[] deltaVertices, Vector3[] deltaNormals, Vector3[] deltaTangents);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void AddBlendShapeFrame(string shapeName, float frameWeight, Vector3[] deltaVertices, Vector3[] deltaNormals, Vector3[] deltaTangents);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_get_bounds(out Bounds value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void INTERNAL_set_bounds(ref Bounds value);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void RecalculateBounds();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void RecalculateNormals();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void Optimize();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern MeshTopology GetTopology(int submesh);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void CombineMeshes(CombineInstance[] combine, [DefaultValue("true")] bool mergeSubMeshes, [DefaultValue("true")] bool useMatrices);

		[ExcludeFromDocs]
		public void CombineMeshes(CombineInstance[] combine, bool mergeSubMeshes)
		{
			bool useMatrices = true;
			CombineMeshes(combine, mergeSubMeshes, useMatrices);
		}

		[ExcludeFromDocs]
		public void CombineMeshes(CombineInstance[] combine)
		{
			bool useMatrices = true;
			bool mergeSubMeshes = true;
			CombineMeshes(combine, mergeSubMeshes, useMatrices);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void MarkDynamic();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void UploadMeshData(bool markNoLogerReadable);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern int GetBlendShapeIndex(string blendShapeName);

		internal InternalShaderChannel GetUVChannel(int uvIndex)
		{
			if (uvIndex < 0 || uvIndex > 3)
			{
				throw new ArgumentException("GetUVChannel called for bad uvIndex", "uvIndex");
			}
			return (InternalShaderChannel)(3 + uvIndex);
		}

		internal static int DefaultDimensionForChannel(InternalShaderChannel channel)
		{
			switch (channel)
			{
			case InternalShaderChannel.Vertex:
			case InternalShaderChannel.Normal:
				return 3;
			case InternalShaderChannel.TexCoord0:
			case InternalShaderChannel.TexCoord1:
			case InternalShaderChannel.TexCoord2:
			case InternalShaderChannel.TexCoord3:
				return 2;
			default:
				if (channel == InternalShaderChannel.Tangent || channel == InternalShaderChannel.Color)
				{
					return 4;
				}
				throw new ArgumentException("DefaultDimensionForChannel called for bad channel", "channel");
			}
		}

		private T[] GetAllocArrayFromChannel<T>(InternalShaderChannel channel, InternalVertexChannelType format, int dim)
		{
			if (canAccess)
			{
				if (HasChannel(channel))
				{
					return (T[])GetAllocArrayFromChannelImpl(channel, format, dim);
				}
			}
			else
			{
				PrintErrorCantAccessMesh(channel);
			}
			return new T[0];
		}

		private T[] GetAllocArrayFromChannel<T>(InternalShaderChannel channel)
		{
			return GetAllocArrayFromChannel<T>(channel, InternalVertexChannelType.Float, DefaultDimensionForChannel(channel));
		}

		private int SafeLength(Array values)
		{
			return (values != null) ? values.Length : 0;
		}

		private int SafeLength<T>(List<T> values)
		{
			return (values != null) ? values.Count : 0;
		}

		private void SetSizedArrayForChannel(InternalShaderChannel channel, InternalVertexChannelType format, int dim, Array values, int valuesCount)
		{
			if (canAccess)
			{
				SetArrayForChannelImpl(channel, format, dim, values, valuesCount);
			}
			else
			{
				PrintErrorCantAccessMesh(channel);
			}
		}

		private void SetArrayForChannel<T>(InternalShaderChannel channel, InternalVertexChannelType format, int dim, T[] values)
		{
			SetSizedArrayForChannel(channel, format, dim, values, SafeLength(values));
		}

		private void SetArrayForChannel<T>(InternalShaderChannel channel, T[] values)
		{
			SetSizedArrayForChannel(channel, InternalVertexChannelType.Float, DefaultDimensionForChannel(channel), values, SafeLength(values));
		}

		private void SetListForChannel<T>(InternalShaderChannel channel, InternalVertexChannelType format, int dim, List<T> values)
		{
			SetSizedArrayForChannel(channel, format, dim, ExtractArrayFromList(values), SafeLength(values));
		}

		private void SetListForChannel<T>(InternalShaderChannel channel, List<T> values)
		{
			SetSizedArrayForChannel(channel, InternalVertexChannelType.Float, DefaultDimensionForChannel(channel), ExtractArrayFromList(values), SafeLength(values));
		}

		public void SetVertices(List<Vector3> inVertices)
		{
			SetListForChannel(InternalShaderChannel.Vertex, inVertices);
		}

		public void SetNormals(List<Vector3> inNormals)
		{
			SetListForChannel(InternalShaderChannel.Normal, inNormals);
		}

		public void SetTangents(List<Vector4> inTangents)
		{
			SetListForChannel(InternalShaderChannel.Tangent, inTangents);
		}

		public void SetColors(List<Color> inColors)
		{
			SetListForChannel(InternalShaderChannel.Color, inColors);
		}

		public void SetColors(List<Color32> inColors)
		{
			SetListForChannel(InternalShaderChannel.Color, InternalVertexChannelType.Color, 1, inColors);
		}

		private void SetUvsImpl<T>(int uvIndex, int dim, List<T> uvs)
		{
			if (uvIndex < 0 || uvIndex > 3)
			{
				Debug.LogError("The uv index is invalid (must be in [0..3]");
			}
			else
			{
				SetListForChannel(GetUVChannel(uvIndex), InternalVertexChannelType.Float, dim, uvs);
			}
		}

		public void SetUVs(int channel, List<Vector2> uvs)
		{
			SetUvsImpl(channel, 2, uvs);
		}

		public void SetUVs(int channel, List<Vector3> uvs)
		{
			SetUvsImpl(channel, 3, uvs);
		}

		public void SetUVs(int channel, List<Vector4> uvs)
		{
			SetUvsImpl(channel, 4, uvs);
		}

		private void GetUVsInternal<T>(List<T> uvs, int uvIndex, int dim)
		{
			InternalShaderChannel uVChannel = GetUVChannel(uvIndex);
			ResizeList(uvs, vertexCount);
			GetArrayFromChannelImpl(uVChannel, InternalVertexChannelType.Float, dim, ExtractArrayFromList(uvs));
		}

		private void GetUVsImpl<T>(int uvIndex, List<T> uvs, int dim)
		{
			if (uvs == null)
			{
				throw new ArgumentException("The result uvs list cannot be null", "uvs");
			}
			if (uvIndex < 0 || uvIndex > 3)
			{
				throw new ArgumentException("The uv index is invalid (must be in [0..3]", "uvIndex");
			}
			uvs.Clear();
			InternalShaderChannel uVChannel = GetUVChannel(uvIndex);
			if (!canAccess)
			{
				PrintErrorCantAccessMesh(uVChannel);
			}
			else if (HasChannel(uVChannel))
			{
				if (vertexCount > uvs.Capacity)
				{
					uvs.Capacity = vertexCount;
				}
				GetUVsInternal(uvs, uvIndex, dim);
			}
		}

		public void GetUVs(int channel, List<Vector2> uvs)
		{
			GetUVsImpl(channel, uvs, 2);
		}

		public void GetUVs(int channel, List<Vector3> uvs)
		{
			GetUVsImpl(channel, uvs, 3);
		}

		public void GetUVs(int channel, List<Vector4> uvs)
		{
			GetUVsImpl(channel, uvs, 4);
		}

		private bool CheckCanAccessSubmesh(int submesh, bool errorAboutTriangles)
		{
			if (!canAccess)
			{
				PrintErrorCantAccessMeshForIndices();
				return false;
			}
			if (submesh < 0 || submesh >= subMeshCount)
			{
				if (errorAboutTriangles)
				{
					PrintErrorBadSubmeshIndexTriangles();
				}
				else
				{
					PrintErrorBadSubmeshIndexIndices();
				}
				return false;
			}
			return true;
		}

		private bool CheckCanAccessSubmeshTriangles(int submesh)
		{
			return CheckCanAccessSubmesh(submesh, true);
		}

		private bool CheckCanAccessSubmeshIndices(int submesh)
		{
			return CheckCanAccessSubmesh(submesh, false);
		}

		public int[] GetTriangles(int submesh)
		{
			return (!CheckCanAccessSubmeshTriangles(submesh)) ? new int[0] : GetTrianglesImpl(submesh);
		}

		public int[] GetIndices(int submesh)
		{
			return (!CheckCanAccessSubmeshIndices(submesh)) ? new int[0] : GetIndicesImpl(submesh);
		}
	}
}
