using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;

namespace UnityEngine.SceneManagement
{
	public struct Scene
	{
		private int m_Handle;

		internal int handle
		{
			get
			{
				return m_Handle;
			}
		}

		public string path
		{
			get
			{
				return GetPathInternal(handle);
			}
		}

		public string name
		{
			get
			{
				return GetNameInternal(handle);
			}
			internal set
			{
				SetNameInternal(handle, value);
			}
		}

		public bool isLoaded
		{
			get
			{
				return GetIsLoadedInternal(handle);
			}
		}

		public int buildIndex
		{
			get
			{
				return GetBuildIndexInternal(handle);
			}
		}

		public bool isDirty
		{
			get
			{
				return GetIsDirtyInternal(handle);
			}
		}

		public int rootCount
		{
			get
			{
				return GetRootCountInternal(handle);
			}
		}

		public bool IsValid()
		{
			return IsValidInternal(handle);
		}

		public GameObject[] GetRootGameObjects()
		{
			List<GameObject> list = new List<GameObject>(rootCount);
			GetRootGameObjects(list);
			return list.ToArray();
		}

		public void GetRootGameObjects(List<GameObject> rootGameObjects)
		{
			if (rootGameObjects.Capacity < rootCount)
			{
				rootGameObjects.Capacity = rootCount;
			}
			rootGameObjects.Clear();
			if (!IsValid())
			{
				throw new ArgumentException("The scene is invalid.");
			}
			if (!isLoaded)
			{
				throw new ArgumentException("The scene is not loaded.");
			}
			if (rootCount != 0)
			{
				GetRootGameObjectsInternal(handle, rootGameObjects);
			}
		}

		public override int GetHashCode()
		{
			return m_Handle;
		}

		public override bool Equals(object other)
		{
			if (!(other is Scene))
			{
				return false;
			}
			Scene scene = (Scene)other;
			return handle == scene.handle;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool IsValidInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern string GetPathInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern string GetNameInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetNameInternal(int sceneHandle, string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool GetIsLoadedInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool GetIsDirtyInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern int GetBuildIndexInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern int GetRootCountInternal(int sceneHandle);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void GetRootGameObjectsInternal(int sceneHandle, object resultRootList);

		public static bool operator ==(Scene lhs, Scene rhs)
		{
			return lhs.handle == rhs.handle;
		}

		public static bool operator !=(Scene lhs, Scene rhs)
		{
			return lhs.handle != rhs.handle;
		}
	}
}
