using UnityEngine;
using UnityEngine.UI;

namespace PowerTools
{
	[DisallowMultipleComponent]
	[RequireComponent(typeof(Animator))]
	public class SpriteAnim : SpriteAnimEventHandler
	{
		private static readonly int STATE_HASH = "a".GetHashCode();

		private static readonly string CONTROLLER_PATH = "SpriteAnimController";

		[SerializeField]
		private AnimationClip m_defaultAnim;

		private static RuntimeAnimatorController m_sharedAnimatorController = null;

		private Animator m_animator;

		private AnimatorOverrideController m_controller;

		private AnimationClipPair[] m_clipPairArray;

		private AnimationClip m_currAnim;

		public AnimationClip GetCurrentAnimation()
		{
			return m_currAnim;
		}

		public float GetCurrentAnimTime()
		{
			if (m_currAnim != null)
			{
				return m_animator.GetCurrentAnimatorStateInfo(0).normalizedTime * m_currAnim.length;
			}
			return 0f;
		}

		public bool IsPlaying(AnimationClip clip = null)
		{
			if (clip == null || m_currAnim == clip)
			{
				return m_animator.GetCurrentAnimatorStateInfo(0).normalizedTime < 1f;
			}
			return false;
		}

		public bool IsPlaying(string animName)
		{
			if (m_currAnim == null)
			{
				return false;
			}
			if (m_currAnim.name == animName)
			{
				return m_animator.GetCurrentAnimatorStateInfo(0).normalizedTime < 1f;
			}
			return false;
		}

		public void Play(AnimationClip anim, float time)
		{
			if (!(anim == null))
			{
				if (!m_animator.enabled)
				{
					m_animator.enabled = true;
				}
				m_clipPairArray[0].overrideClip = anim;
				m_controller.clips = m_clipPairArray;
				m_animator.linearVelocityBlending = false;
				if (time > 0f && anim.length > 0f)
				{
					m_animator.Play(STATE_HASH, 0, time % anim.length / anim.length);
				}
				else
				{
					m_animator.Play(STATE_HASH);
				}
				m_currAnim = anim;
			}
		}

		public void Play(AnimationClip anim)
		{
			Play(anim, 0f);
		}

		public void Stop()
		{
			m_animator.enabled = false;
		}

		private void Awake()
		{
			m_controller = new AnimatorOverrideController();
			if (m_sharedAnimatorController == null)
			{
				m_sharedAnimatorController = Resources.Load<RuntimeAnimatorController>(CONTROLLER_PATH);
			}
			m_controller.runtimeAnimatorController = m_sharedAnimatorController;
			m_animator = GetComponent<Animator>();
			m_animator.runtimeAnimatorController = m_controller;
			m_clipPairArray = m_controller.clips;
			Play(m_defaultAnim);
		}

		private void Reset()
		{
			if (GetComponent<RectTransform>() == null)
			{
				if (GetComponent<Sprite>() == null)
				{
					base.gameObject.AddComponent<SpriteRenderer>();
				}
			}
			else if (GetComponent<Image>() == null)
			{
				base.gameObject.AddComponent<Image>();
			}
		}
	}
}
