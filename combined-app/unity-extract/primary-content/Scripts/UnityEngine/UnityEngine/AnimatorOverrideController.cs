using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine.Internal;

namespace UnityEngine
{
	public sealed class AnimatorOverrideController : RuntimeAnimatorController
	{
		public extern RuntimeAnimatorController runtimeAnimatorController
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public AnimationClip this[string name]
		{
			get
			{
				return Internal_GetClipByName(name, true);
			}
			set
			{
				Internal_SetClipByName(name, value);
			}
		}

		public AnimationClip this[AnimationClip clip]
		{
			get
			{
				return Internal_GetClip(clip, true);
			}
			set
			{
				Internal_SetClip(clip, value);
			}
		}

		public AnimationClipPair[] clips
		{
			get
			{
				AnimationClip[] originalClips = GetOriginalClips();
				Dictionary<AnimationClip, bool> dictionary = new Dictionary<AnimationClip, bool>(originalClips.Length);
				AnimationClip[] array = originalClips;
				foreach (AnimationClip key in array)
				{
					dictionary[key] = true;
				}
				originalClips = new AnimationClip[dictionary.Count];
				dictionary.Keys.CopyTo(originalClips, 0);
				AnimationClipPair[] array2 = new AnimationClipPair[originalClips.Length];
				for (int j = 0; j < originalClips.Length; j++)
				{
					array2[j] = new AnimationClipPair();
					array2[j].originalClip = originalClips[j];
					array2[j].overrideClip = Internal_GetClip(originalClips[j], false);
				}
				return array2;
			}
			set
			{
				for (int i = 0; i < value.Length; i++)
				{
					Internal_SetClip(value[i].originalClip, value[i].overrideClip, false);
				}
				Internal_SetDirty();
			}
		}

		public AnimatorOverrideController()
		{
			Internal_CreateAnimationSet(this);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_CreateAnimationSet([Writable] AnimatorOverrideController self);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnimationClip Internal_GetClipByName(string name, bool returnEffectiveClip);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void Internal_SetClipByName(string name, AnimationClip clip);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnimationClip Internal_GetClip(AnimationClip originalClip, bool returnEffectiveClip);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void Internal_SetClip(AnimationClip originalClip, AnimationClip overrideClip, [DefaultValue("true")] bool notify);

		[ExcludeFromDocs]
		private void Internal_SetClip(AnimationClip originalClip, AnimationClip overrideClip)
		{
			bool notify = true;
			Internal_SetClip(originalClip, overrideClip, notify);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern void Internal_SetDirty();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnimationClip[] GetOriginalClips();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern AnimationClip[] GetOverrideClips();
	}
}
