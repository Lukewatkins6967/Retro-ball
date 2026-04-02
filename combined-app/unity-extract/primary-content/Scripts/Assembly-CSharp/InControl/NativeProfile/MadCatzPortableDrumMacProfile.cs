namespace InControl.NativeProfile
{
	public class MadCatzPortableDrumMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzPortableDrumMacProfile()
		{
			base.Name = "Mad Catz Portable Drum";
			base.Meta = "Mad Catz Portable Drum on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)39025
				}
			};
		}
	}
}
