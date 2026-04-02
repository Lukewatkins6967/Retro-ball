using PowerTools;
using UnityEngine;

public class Effect : MonoBehaviour
{
	[SerializeField]
	private bool m_destoryOnAnimEnd = true;

	private SpriteAnim m_anim;

	private void Start()
	{
		m_anim = GetComponent<SpriteAnim>();
	}

	private void Update()
	{
		if (m_destoryOnAnimEnd && !m_anim.IsPlaying())
		{
			Object.Destroy(base.gameObject);
		}
	}
}
