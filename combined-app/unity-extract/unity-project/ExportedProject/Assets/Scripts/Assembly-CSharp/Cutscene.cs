using UnityEngine;
using UnityEngine.UI;

public class Cutscene : MonoBehaviour
{
	[SerializeField]
	private Image m_image;

	[SerializeField]
	private GameObject m_continuePrompt;

	private Sprite[] m_sprites;

	private int m_index = -1;

	public void ShowContinuePrompt()
	{
		m_continuePrompt.gameObject.SetActive(true);
	}

	public void SetSprites(Sprite[] sprites)
	{
		m_sprites = sprites;
		m_index = -1;
		Advance();
	}

	public void Advance()
	{
		if (m_index < m_sprites.Length - 1)
		{
			m_index++;
			m_image.sprite = m_sprites[m_index];
			m_continuePrompt.gameObject.SetActive(false);
		}
	}

	public bool IsFinished()
	{
		return m_index == m_sprites.Length - 1;
	}
}
